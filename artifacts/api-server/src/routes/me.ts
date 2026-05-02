import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  appUsersTable,
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

router.get("/me/books", async (req, res) => {
  try {
    await ensureUser((req as unknown as AuthedRequest).userId);
    const rows = await db
      .select()
      .from(userBooksTable)
      .where(eq(userBooksTable.userId, (req as unknown as AuthedRequest).userId))
      .orderBy(desc(userBooksTable.updatedAt));
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
    await ensureUser((req as unknown as AuthedRequest).userId);
    const body = req.body as PostBookBody;
    if (!body?.title || !body?.author || !body?.source || !body?.visualStyle) {
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

    if (body.source === "demo" && body.demoBookId) {
      const [existing] = await db
        .select()
        .from(userBooksTable)
        .where(
          and(
            eq(userBooksTable.userId, (req as unknown as AuthedRequest).userId),
            eq(userBooksTable.demoBookId, body.demoBookId),
          ),
        )
        .limit(1);
      if (existing) {
        res.json({ book: serializeBook(existing) });
        return;
      }
    }

    const [created] = await db
      .insert(userBooksTable)
      .values({
        userId: (req as unknown as AuthedRequest).userId,
        title: body.title,
        author: body.author,
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

export default router;
