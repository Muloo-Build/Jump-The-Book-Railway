import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  appUsersTable,
  bookBiblesTable,
  userBooksTable,
  userScenesTable,
} from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

// ── Validation helpers ───────────────────────────────────────────────────────
const VISUAL_STYLES = new Set([
  "comic-book",
  "watercolour",
  "dark-cinematic",
  "animated-storybook",
  "manga-inspired",
  "fantasy-illustration",
]);
const SPOILER_MODES = new Set(["no-spoilers", "light-guidance", "full-companion"]);
const READING_MODES = new Set(["reading", "listening", "both"]);
const BOOK_SOURCES = new Set(["demo", "upload", "manual"]);

function isFiniteInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n);
}

async function ensureUser(userId: string) {
  const [existing] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(appUsersTable)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [reread] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.userId, userId))
    .limit(1);
  return reread!;
}

// ── /me ──────────────────────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  try {
    const user = await ensureUser((req as unknown as AuthedRequest).userId);
    res.json({
      userId: user.userId,
      defaultVisualStyle: user.defaultVisualStyle,
      spoilerMode: user.spoilerMode,
      readingMode: user.readingMode,
      onboarded: !!user.onboardedAt,
      onboardedAt: user.onboardedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "GET /me failed");
    res.status(500).json({ error: "Failed to load user" });
  }
});

interface PatchMeBody {
  defaultVisualStyle?: string;
  spoilerMode?: string;
  readingMode?: string;
  markOnboarded?: boolean;
}

router.patch("/me", async (req, res) => {
  try {
    await ensureUser((req as unknown as AuthedRequest).userId);
    const body = (req.body ?? {}) as PatchMeBody;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.defaultVisualStyle !== undefined) {
      if (typeof body.defaultVisualStyle !== "string" || !VISUAL_STYLES.has(body.defaultVisualStyle)) {
        res.status(400).json({ error: "Invalid defaultVisualStyle" });
        return;
      }
      updates.defaultVisualStyle = body.defaultVisualStyle;
    }
    if (body.spoilerMode !== undefined) {
      if (typeof body.spoilerMode !== "string" || !SPOILER_MODES.has(body.spoilerMode)) {
        res.status(400).json({ error: "Invalid spoilerMode" });
        return;
      }
      updates.spoilerMode = body.spoilerMode;
    }
    if (body.readingMode !== undefined) {
      if (typeof body.readingMode !== "string" || !READING_MODES.has(body.readingMode)) {
        res.status(400).json({ error: "Invalid readingMode" });
        return;
      }
      updates.readingMode = body.readingMode;
    }
    if (body.markOnboarded === true) updates.onboardedAt = new Date();
    const [updated] = await db
      .update(appUsersTable)
      .set(updates)
      .where(eq(appUsersTable.userId, (req as unknown as AuthedRequest).userId))
      .returning();
    res.json({
      userId: updated!.userId,
      defaultVisualStyle: updated!.defaultVisualStyle,
      spoilerMode: updated!.spoilerMode,
      readingMode: updated!.readingMode,
      onboarded: !!updated!.onboardedAt,
      onboardedAt: updated!.onboardedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "PATCH /me failed");
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ── /me/books ────────────────────────────────────────────────────────────────

function serializeBook(b: typeof userBooksTable.$inferSelect) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    format: b.format,
    source: b.source,
    demoBookId: b.demoBookId,
    coverGradient: (b.coverGradient as string[]) ?? [],
    visualStyle: b.visualStyle,
    spoilerMode: b.spoilerMode,
    currentChapter: b.currentChapter,
    currentPage: b.currentPage,
    currentAudioTimestamp: b.currentAudioTimestamp,
    progress: b.progress,
    userNote: b.userNote,
    tagline: b.tagline,
    heroImage: b.heroImage,
    totalChapters: b.totalChapters,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

// Dedup key for a stored book row. Demo books group by their canonical
// demo id; everything else groups by case-insensitive (title, author).
function bookGroupKey(b: typeof userBooksTable.$inferSelect): string {
  if (b.source === "demo" && b.demoBookId) return `demo:${b.demoBookId}`;
  const t = (b.title ?? "").trim().toLowerCase();
  const a = (b.author ?? "").trim().toLowerCase();
  return `book:${t}|${a}`;
}

// Group rows that represent the same logical book. Within each group the
// most-recently-updated row is kept as the canonical row; the rest are
// duplicates that should be merged into it.
function groupDuplicateBooks(
  rows: (typeof userBooksTable.$inferSelect)[],
): {
  canonical: typeof userBooksTable.$inferSelect;
  duplicates: (typeof userBooksTable.$inferSelect)[];
}[] {
  const groups = new Map<string, (typeof userBooksTable.$inferSelect)[]>();
  for (const r of rows) {
    const k = bookGroupKey(r);
    const list = groups.get(k);
    if (list) list.push(r);
    else groups.set(k, [r]);
  }
  const out: {
    canonical: typeof userBooksTable.$inferSelect;
    duplicates: (typeof userBooksTable.$inferSelect)[];
  }[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    out.push({ canonical: group[0], duplicates: group.slice(1) });
  }
  return out;
}

// Merge duplicate book rows for one user inside a transaction:
//   • move scenes from each duplicate to the canonical row, dropping any that
//     would collide with an existing (chapterNumber, sceneIndex) on canonical
//   • move the duplicate's bible to the canonical row only if canonical has
//     no bible yet, otherwise drop the duplicate's bible
//   • patch the canonical row with the best progress/chapter/cover/etc from
//     the discarded rows so nothing the user had is lost
//   • delete the duplicate user_books rows
// Returns true if any merging happened (so the caller knows to re-read).
async function mergeDuplicateBooksForUser(
  userId: string,
  rows: (typeof userBooksTable.$inferSelect)[],
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void },
): Promise<boolean> {
  const groups = groupDuplicateBooks(rows);
  const groupsWithDups = groups.filter((g) => g.duplicates.length > 0);
  if (groupsWithDups.length === 0) return false;

  await db.transaction(async (tx) => {
    for (const { canonical, duplicates } of groupsWithDups) {
      // Compute the merged metadata across canonical + duplicates so we keep
      // the best of each field (largest progress, latest chapter, any cover).
      const all = [canonical, ...duplicates];
      const mergedProgress = all.reduce((m, g) => Math.max(m, g.progress ?? 0), 0);
      const mergedChapter = all.reduce(
        (m, g) => Math.max(m, g.currentChapter ?? 0),
        0,
      );
      const heroImage =
        all.find((g) => g.heroImage && g.heroImage.trim().length > 0)
          ?.heroImage ?? canonical.heroImage;
      const totalChapters =
        all.find((g) => g.totalChapters != null)?.totalChapters ??
        canonical.totalChapters;
      const tagline =
        all.find((g) => g.tagline && g.tagline.trim().length > 0)?.tagline ??
        canonical.tagline;
      const coverGradient =
        canonical.coverGradient && (canonical.coverGradient as string[]).length > 0
          ? canonical.coverGradient
          : (all.find(
              (g) => g.coverGradient && (g.coverGradient as string[]).length > 0,
            )?.coverGradient ?? canonical.coverGradient);

      for (const dup of duplicates) {
        // Move scenes that don't collide with an existing canonical scene at
        // the same (chapterNumber, sceneIndex). The user_scenes table has a
        // uniqueIndex on (userBookId, chapterNumber, sceneIndex) so a blind
        // UPDATE could fail; this NOT EXISTS guard skips conflicts.
        // user_scenes has no updated_at column; only the user_book_id moves.
        await tx.execute(sql`
          UPDATE ${userScenesTable}
          SET ${userScenesTable.userBookId} = ${canonical.id}
          WHERE ${userScenesTable.userBookId} = ${dup.id}
            AND NOT EXISTS (
              SELECT 1 FROM ${userScenesTable} c
              WHERE c.user_book_id = ${canonical.id}
                AND c.chapter_number = ${userScenesTable.chapterNumber}
                AND c.scene_index = ${userScenesTable.sceneIndex}
            )
        `);
        // Drop any leftover duplicate scenes that collided. Canonical's
        // existing scene wins (it's the most recently updated row's scene).
        await tx
          .delete(userScenesTable)
          .where(eq(userScenesTable.userBookId, dup.id));

        // Move the bible only if canonical has none; otherwise delete the
        // duplicate's bible (uniqueIndex on userBookId means we can't have
        // two pointing at canonical).
        await tx.execute(sql`
          UPDATE ${bookBiblesTable}
          SET ${bookBiblesTable.userBookId} = ${canonical.id},
              ${bookBiblesTable.updatedAt} = NOW()
          WHERE ${bookBiblesTable.userBookId} = ${dup.id}
            AND NOT EXISTS (
              SELECT 1 FROM ${bookBiblesTable} c
              WHERE c.user_book_id = ${canonical.id}
            )
        `);
        await tx
          .delete(bookBiblesTable)
          .where(eq(bookBiblesTable.userBookId, dup.id));

        // Finally, drop the duplicate book row.
        await tx
          .delete(userBooksTable)
          .where(
            and(
              eq(userBooksTable.id, dup.id),
              eq(userBooksTable.userId, userId),
            ),
          );
      }

      // Patch the canonical row with merged metadata.
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (mergedProgress !== canonical.progress) patch.progress = mergedProgress;
      if (mergedChapter !== canonical.currentChapter)
        patch.currentChapter = mergedChapter;
      if (heroImage !== canonical.heroImage) patch.heroImage = heroImage;
      if (totalChapters !== canonical.totalChapters)
        patch.totalChapters = totalChapters;
      if (tagline !== canonical.tagline) patch.tagline = tagline;
      if (coverGradient !== canonical.coverGradient)
        patch.coverGradient = coverGradient;
      await tx
        .update(userBooksTable)
        .set(patch)
        .where(eq(userBooksTable.id, canonical.id));
    }
  });

  log.info(
    {
      userId,
      mergedGroups: groupsWithDups.length,
      removedRows: groupsWithDups.reduce((n, g) => n + g.duplicates.length, 0),
    },
    "merged duplicate user_books rows",
  );
  return true;
}

router.get("/me/books", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    await ensureUser(userId);
    let rows = await db
      .select()
      .from(userBooksTable)
      .where(eq(userBooksTable.userId, userId))
      .orderBy(desc(userBooksTable.updatedAt));

    // Self-healing merge: if historical duplicates exist (the API used to
    // always insert), merge them in a transaction and re-read. The merge is
    // idempotent and only writes when duplicates are actually present, so
    // the steady-state path is just SELECT.
    const merged = await mergeDuplicateBooksForUser(userId, rows, req.log);
    if (merged) {
      rows = await db
        .select()
        .from(userBooksTable)
        .where(eq(userBooksTable.userId, userId))
        .orderBy(desc(userBooksTable.updatedAt));
    }

    res.json({ books: rows.map(serializeBook) });
  } catch (err) {
    req.log.error({ err }, "GET /me/books failed");
    res.status(500).json({ error: "Failed to list books" });
  }
});

interface PostBookBody {
  title: string;
  author: string;
  format?: string;
  source: "demo" | "upload" | "manual";
  demoBookId?: string | null;
  coverGradient?: string[];
  visualStyle: string;
  spoilerMode: string;
  currentChapter?: number;
  currentPage?: number;
  currentAudioTimestamp?: string;
  progress?: number;
  userNote?: string;
  tagline?: string | null;
  heroImage?: string | null;
  totalChapters?: number | null;
}

router.post("/me/books", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    await ensureUser(userId);
    const body = req.body as PostBookBody;

    // Trim title/author up front so " Foo " and "Foo" are treated as the
    // same book and rows never store padding whitespace.
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const author = typeof body?.author === "string" ? body.author.trim() : "";

    if (!title || !author || !body?.source || !body?.visualStyle) {
      res.status(400).json({
        error: "title, author, source, visualStyle required",
      });
      return;
    }
    if (!BOOK_SOURCES.has(body.source)) {
      res.status(400).json({ error: "Invalid source" });
      return;
    }
    if (!VISUAL_STYLES.has(body.visualStyle)) {
      res.status(400).json({ error: "Invalid visualStyle" });
      return;
    }
    if (!body.spoilerMode || !SPOILER_MODES.has(body.spoilerMode)) {
      res.status(400).json({ error: "Invalid spoilerMode" });
      return;
    }
    if (body.currentChapter !== undefined && (!isFiniteInt(body.currentChapter) || body.currentChapter < 0)) {
      res.status(400).json({ error: "currentChapter must be a non-negative integer" });
      return;
    }
    if (body.progress !== undefined && (typeof body.progress !== "number" || body.progress < 0 || body.progress > 100)) {
      res.status(400).json({ error: "progress must be 0-100" });
      return;
    }

    // ── Dedup: never create a second row for the same logical book ────────
    // 1) Demo books: match by (userId, demoBookId) (existing behavior).
    // 2) Upload/manual books: match by (userId, lower(title), lower(author)).
    // In either case, when we find an existing row we patch in any newly
    // supplied non-empty metadata (cover, format, chapter, etc.) and return
    // the existing id so the client doesn't navigate to a freshly-created
    // duplicate.
    let existing: typeof userBooksTable.$inferSelect | undefined;
    if (body.source === "demo" && body.demoBookId) {
      [existing] = await db
        .select()
        .from(userBooksTable)
        .where(
          and(
            eq(userBooksTable.userId, userId),
            eq(userBooksTable.demoBookId, body.demoBookId),
          ),
        )
        .limit(1);
    } else {
      [existing] = await db
        .select()
        .from(userBooksTable)
        .where(
          and(
            eq(userBooksTable.userId, userId),
            sql`lower(trim(${userBooksTable.title})) = ${title.toLowerCase()}`,
            sql`lower(trim(${userBooksTable.author})) = ${author.toLowerCase()}`,
          ),
        )
        .orderBy(desc(userBooksTable.updatedAt))
        .limit(1);
    }

    if (existing) {
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      // Only overwrite when the caller provided meaningful new data — never
      // clobber existing values with a blank.
      if (body.format && body.format !== existing.format) patch.format = body.format;
      if (body.heroImage && body.heroImage.trim()) patch.heroImage = body.heroImage;
      if (body.tagline && body.tagline.trim()) patch.tagline = body.tagline;
      if (body.coverGradient && body.coverGradient.length > 0) patch.coverGradient = body.coverGradient;
      if (body.totalChapters != null && body.totalChapters !== existing.totalChapters) patch.totalChapters = body.totalChapters;
      if (
        body.currentChapter != null &&
        body.currentChapter > (existing.currentChapter ?? 0)
      ) {
        patch.currentChapter = body.currentChapter;
      }
      const [refreshed] = await db
        .update(userBooksTable)
        .set(patch)
        .where(eq(userBooksTable.id, existing.id))
        .returning();
      res.json({ book: serializeBook(refreshed ?? existing), deduped: true });
      return;
    }

    const [created] = await db
      .insert(userBooksTable)
      .values({
        userId,
        title,
        author,
        format: body.format ?? "Paperback",
        source: body.source,
        demoBookId: body.demoBookId ?? null,
        coverGradient: body.coverGradient ?? [],
        visualStyle: body.visualStyle,
        spoilerMode: body.spoilerMode,
        currentChapter: body.currentChapter ?? 1,
        currentPage: body.currentPage ?? 0,
        currentAudioTimestamp: body.currentAudioTimestamp ?? "00:00:00",
        progress: body.progress ?? 0,
        userNote: body.userNote ?? "",
        tagline: body.tagline ?? null,
        heroImage: body.heroImage ?? null,
        totalChapters: body.totalChapters ?? null,
      })
      .returning();
    res.status(201).json({ book: serializeBook(created!) });
  } catch (err) {
    req.log.error({ err }, "POST /me/books failed");
    res.status(500).json({ error: "Failed to add book" });
  }
});

router.patch("/me/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = (req.body ?? {}) as Partial<PostBookBody>;

    if (body.visualStyle !== undefined && !VISUAL_STYLES.has(body.visualStyle)) {
      res.status(400).json({ error: "Invalid visualStyle" });
      return;
    }
    if (body.spoilerMode !== undefined && !SPOILER_MODES.has(body.spoilerMode)) {
      res.status(400).json({ error: "Invalid spoilerMode" });
      return;
    }
    if (
      body.currentChapter !== undefined &&
      (!isFiniteInt(body.currentChapter) || body.currentChapter < 0)
    ) {
      res.status(400).json({ error: "currentChapter must be a non-negative integer" });
      return;
    }
    if (
      body.currentPage !== undefined &&
      (!isFiniteInt(body.currentPage) || body.currentPage < 0)
    ) {
      res.status(400).json({ error: "currentPage must be a non-negative integer" });
      return;
    }
    if (
      body.totalChapters !== undefined &&
      body.totalChapters !== null &&
      (!isFiniteInt(body.totalChapters) || body.totalChapters < 0)
    ) {
      res.status(400).json({ error: "totalChapters must be a non-negative integer" });
      return;
    }
    if (
      body.progress !== undefined &&
      (typeof body.progress !== "number" || body.progress < 0 || body.progress > 100)
    ) {
      res.status(400).json({ error: "progress must be 0-100" });
      return;
    }

    // Trim title/author when supplied so we never store padding whitespace and
    // never let a blank value silently overwrite a real one.
    if (body.title !== undefined) {
      const t = typeof body.title === "string" ? body.title.trim() : "";
      if (!t) {
        res.status(400).json({ error: "title cannot be empty" });
        return;
      }
      body.title = t;
    }
    if (body.author !== undefined) {
      const a = typeof body.author === "string" ? body.author.trim() : "";
      if (!a) {
        res.status(400).json({ error: "author cannot be empty" });
        return;
      }
      body.author = a;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const fields: (keyof PostBookBody)[] = [
      "title",
      "author",
      "format",
      "currentChapter",
      "currentPage",
      "currentAudioTimestamp",
      "progress",
      "userNote",
      "visualStyle",
      "spoilerMode",
      "totalChapters",
      "tagline",
      "heroImage",
      "coverGradient",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }
    const [updated] = await db
      .update(userBooksTable)
      .set(updates)
      .where(
        and(
          eq(userBooksTable.id, id),
          eq(userBooksTable.userId, (req as unknown as AuthedRequest).userId),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ book: serializeBook(updated) });
  } catch (err) {
    req.log.error({ err }, "PATCH /me/books/:id failed");
    res.status(500).json({ error: "Failed to update book" });
  }
});

router.delete("/me/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db
      .delete(userBooksTable)
      .where(
        and(
          eq(userBooksTable.id, id),
          eq(userBooksTable.userId, (req as unknown as AuthedRequest).userId),
        ),
      )
      .returning({ id: userBooksTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /me/books/:id failed");
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// ── /me/books/:id/scenes ─────────────────────────────────────────────────────

function serializeScene(s: typeof userScenesTable.$inferSelect) {
  return {
    id: s.id,
    userBookId: s.userBookId,
    chapterNumber: s.chapterNumber,
    sceneIndex: s.sceneIndex,
    title: s.title,
    summary: s.summary,
    narration: s.narration,
    location: s.location,
    mood: s.mood,
    characters: (s.characters as string[]) ?? [],
    gradientColors: (s.gradientColors as string[]) ?? [],
    imagePrompt: s.imagePrompt,
    imageUrl: s.imageUrl,
    visualStyle: s.visualStyle,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/me/books/:id/scenes", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await db
      .select()
      .from(userScenesTable)
      .where(
        and(
          eq(userScenesTable.userBookId, id),
          eq(userScenesTable.userId, (req as unknown as AuthedRequest).userId),
        ),
      )
      .orderBy(userScenesTable.chapterNumber, userScenesTable.sceneIndex);
    res.json({ scenes: rows.map(serializeScene) });
  } catch (err) {
    req.log.error({ err }, "GET /me/books/:id/scenes failed");
    res.status(500).json({ error: "Failed to load scenes" });
  }
});

router.get("/me/scenes", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(userScenesTable)
      .where(eq(userScenesTable.userId, (req as unknown as AuthedRequest).userId))
      .orderBy(desc(userScenesTable.createdAt))
      .limit(200);
    res.json({ scenes: rows.map(serializeScene) });
  } catch (err) {
    req.log.error({ err }, "GET /me/scenes failed");
    res.status(500).json({ error: "Failed to load scene library" });
  }
});

interface PostSceneBody {
  chapterNumber: number;
  sceneIndex: number;
  title: string;
  summary?: string;
  narration?: string;
  location?: string;
  mood?: string;
  characters?: string[];
  gradientColors?: string[];
  imagePrompt?: string;
  imageUrl?: string | null;
  visualStyle?: string;
  sceneCacheKey?: string | null;
  imageCacheKey?: string | null;
}

router.post("/me/books/:id/scenes", async (req, res) => {
  try {
    const userBookId = req.params.id;
    const body = req.body as PostSceneBody;
    if (
      !body ||
      !isFiniteInt(body.chapterNumber) ||
      !isFiniteInt(body.sceneIndex) ||
      !body.title
    ) {
      res
        .status(400)
        .json({ error: "chapterNumber, sceneIndex, title are required" });
      return;
    }
    if (body.chapterNumber < 0 || body.sceneIndex < 0) {
      res.status(400).json({ error: "chapterNumber/sceneIndex must be non-negative" });
      return;
    }
    if (body.visualStyle !== undefined && !VISUAL_STYLES.has(body.visualStyle)) {
      res.status(400).json({ error: "Invalid visualStyle" });
      return;
    }
    // Verify the book belongs to this user
    const [book] = await db
      .select({ id: userBooksTable.id })
      .from(userBooksTable)
      .where(
        and(
          eq(userBooksTable.id, userBookId),
          eq(userBooksTable.userId, (req as unknown as AuthedRequest).userId),
        ),
      )
      .limit(1);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    const values = {
      userId: (req as unknown as AuthedRequest).userId,
      userBookId,
      chapterNumber: body.chapterNumber,
      sceneIndex: body.sceneIndex,
      title: body.title,
      summary: body.summary ?? null,
      narration: body.narration ?? null,
      location: body.location ?? null,
      mood: body.mood ?? null,
      characters: body.characters ?? [],
      gradientColors: body.gradientColors ?? [],
      imagePrompt: body.imagePrompt ?? null,
      imageUrl: body.imageUrl ?? null,
      visualStyle: body.visualStyle ?? null,
      sceneCacheKey: body.sceneCacheKey ?? null,
      imageCacheKey: body.imageCacheKey ?? null,
    };
    const [saved] = await db
      .insert(userScenesTable)
      .values(values)
      .onConflictDoUpdate({
        target: [
          userScenesTable.userBookId,
          userScenesTable.chapterNumber,
          userScenesTable.sceneIndex,
        ],
        set: {
          title: values.title,
          summary: values.summary,
          narration: values.narration,
          location: values.location,
          mood: values.mood,
          characters: values.characters,
          gradientColors: values.gradientColors,
          imagePrompt: values.imagePrompt,
          imageUrl: sql`COALESCE(EXCLUDED.image_url, ${userScenesTable.imageUrl})`,
          visualStyle: values.visualStyle,
          sceneCacheKey: values.sceneCacheKey,
          imageCacheKey: values.imageCacheKey,
        },
      })
      .returning();
    res.json({ scene: serializeScene(saved!) });
  } catch (err) {
    req.log.error({ err }, "POST /me/books/:id/scenes failed");
    res.status(500).json({ error: "Failed to save scene" });
  }
});

// ── Orphan scene recovery ────────────────────────────────────────────────────
// Scenes whose `user_book_id` no longer matches any row in `user_books` for
// this user can happen when a book row was deleted from somewhere other than
// the cascading DELETE endpoint (manual cleanup, schema migration, etc.) or
// when the user signed out, lost their library, and only the scene rows were
// preserved by some other process. The two endpoints below let the client
// either give those scenes a fresh book to belong to, or forget them.

// List orphan scene groups for the current user.
router.get("/me/orphan-scenes", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const rows = await db.execute<{
      user_book_id: string;
      scene_count: number;
      latest_created_at: Date;
    }>(sql`
      SELECT s.user_book_id,
             COUNT(*)::int AS scene_count,
             MAX(s.created_at) AS latest_created_at
      FROM ${userScenesTable} s
      LEFT JOIN ${userBooksTable} b
        ON b.id = s.user_book_id AND b.user_id = ${userId}
      WHERE s.user_id = ${userId} AND b.id IS NULL
      GROUP BY s.user_book_id
      ORDER BY MAX(s.created_at) DESC
    `);
    res.json({
      groups: rows.rows.map((r) => ({
        userBookId: r.user_book_id,
        sceneCount: r.scene_count,
        latestCreatedAt: new Date(r.latest_created_at).toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "GET /me/orphan-scenes failed");
    res.status(500).json({ error: "Failed to load orphan scenes" });
  }
});

interface ClaimOrphanBody {
  userBookId: string;
  title: string;
  author: string;
  visualStyle?: string;
  spoilerMode?: string;
  tagline?: string | null;
  heroImage?: string | null;
}

// Adopt a group of orphan scenes by creating a fresh book row and rewriting
// the user_book_id of every matching scene to point at it. The original
// orphan id is dropped — the client should refetch scenes after this call.
router.post("/me/orphan-scenes/claim", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    await ensureUser(userId);
    const body = (req.body ?? {}) as ClaimOrphanBody;
    const orphanId = typeof body.userBookId === "string" ? body.userBookId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : "";
    if (!orphanId || !title || !author) {
      res.status(400).json({ error: "userBookId, title, author required" });
      return;
    }
    const visualStyle = body.visualStyle ?? "fantasy-illustration";
    if (!VISUAL_STYLES.has(visualStyle)) {
      res.status(400).json({ error: "Invalid visualStyle" });
      return;
    }
    const spoilerMode = body.spoilerMode ?? "no-spoilers";
    if (!SPOILER_MODES.has(spoilerMode)) {
      res.status(400).json({ error: "Invalid spoilerMode" });
      return;
    }

    // Confirm the orphan id really is orphaned for THIS user — never let a
    // request reach across to another user's data.
    const [stillExists] = await db
      .select({ id: userBooksTable.id })
      .from(userBooksTable)
      .where(
        and(
          eq(userBooksTable.id, orphanId),
          eq(userBooksTable.userId, userId),
        ),
      )
      .limit(1);
    if (stillExists) {
      res
        .status(409)
        .json({ error: "Book row still exists. Use PATCH /me/books/:id." });
      return;
    }

    // If the user already has a book with the same title+author, reuse that
    // row; otherwise create a fresh one. Either way, point all matching
    // orphan scenes at the canonical id.
    let [target] = await db
      .select()
      .from(userBooksTable)
      .where(
        and(
          eq(userBooksTable.userId, userId),
          sql`lower(trim(${userBooksTable.title})) = ${title.toLowerCase()}`,
          sql`lower(trim(${userBooksTable.author})) = ${author.toLowerCase()}`,
        ),
      )
      .orderBy(desc(userBooksTable.updatedAt))
      .limit(1);
    if (!target) {
      [target] = await db
        .insert(userBooksTable)
        .values({
          userId,
          title,
          author,
          format: "Paperback",
          source: "manual",
          coverGradient: [],
          visualStyle,
          spoilerMode,
          tagline: body.tagline ?? null,
          heroImage: body.heroImage ?? null,
        })
        .returning();
    }

    const moved = await db
      .update(userScenesTable)
      .set({ userBookId: target!.id })
      .where(
        and(
          eq(userScenesTable.userId, userId),
          eq(userScenesTable.userBookId, orphanId),
        ),
      )
      .returning({ id: userScenesTable.id });

    res.json({
      book: serializeBook(target!),
      movedSceneCount: moved.length,
    });
  } catch (err) {
    req.log.error({ err }, "POST /me/orphan-scenes/claim failed");
    res.status(500).json({ error: "Failed to claim orphan scenes" });
  }
});

// Delete every orphan scene for a given (orphaned) user_book_id.
router.delete("/me/orphan-scenes/:userBookId", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const orphanId = req.params.userBookId;

    // Refuse to operate on ids that still have a live book row — the user
    // should DELETE /me/books/:id (which cascades) for those.
    const [stillExists] = await db
      .select({ id: userBooksTable.id })
      .from(userBooksTable)
      .where(
        and(
          eq(userBooksTable.id, orphanId),
          eq(userBooksTable.userId, userId),
        ),
      )
      .limit(1);
    if (stillExists) {
      res
        .status(409)
        .json({ error: "Book row still exists. Use DELETE /me/books/:id." });
      return;
    }

    const removed = await db
      .delete(userScenesTable)
      .where(
        and(
          eq(userScenesTable.userId, userId),
          eq(userScenesTable.userBookId, orphanId),
        ),
      )
      .returning({ id: userScenesTable.id });
    res.json({ ok: true, removedSceneCount: removed.length });
  } catch (err) {
    req.log.error({ err }, "DELETE /me/orphan-scenes/:userBookId failed");
    res.status(500).json({ error: "Failed to delete orphan scenes" });
  }
});

export default router;
