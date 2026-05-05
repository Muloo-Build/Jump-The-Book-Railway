import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import {
  bookBiblesTable,
  userBooksTable,
  userScenesTable,
} from "@workspace/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

// ── /me/streak ───────────────────────────────────────────────────────────────
// Reading streak = consecutive UTC days with at least one "activity" event.
// Activity = a generated scene OR a book added/updated. Computed live from
// existing tables — no separate streak ledger to keep in sync.
//
// Returns:
//   currentStreak   number of consecutive days ending today (or yesterday if
//                   today has no activity yet — keeps the streak alive until
//                   midnight UTC the next day)
//   longestStreak   max run ever
//   todayActive     did the user do something today (UTC)?
//   lastActiveDate  YYYY-MM-DD of the most recent activity, or null
router.get("/me/streak", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;

    // Pull every distinct UTC activity day from the last 18 months. Capping
    // the window keeps the query bounded for power users without ever
    // affecting "current streak" answers (a >18-month gap is not a streak).
    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 540);

    const sceneDays = await db
      .selectDistinct({
        day: sql<string>`to_char(${userScenesTable.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      })
      .from(userScenesTable)
      .where(
        and(
          eq(userScenesTable.userId, userId),
          gte(userScenesTable.createdAt, cutoff),
        ),
      );

    const bookDays = await db
      .selectDistinct({
        day: sql<string>`to_char(${userBooksTable.updatedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      })
      .from(userBooksTable)
      .where(
        and(
          eq(userBooksTable.userId, userId),
          gte(userBooksTable.updatedAt, cutoff),
        ),
      );

    const activeSet = new Set<string>();
    for (const r of sceneDays) if (r.day) activeSet.add(r.day);
    for (const r of bookDays) if (r.day) activeSet.add(r.day);

    if (activeSet.size === 0) {
      res.json({
        currentStreak: 0,
        longestStreak: 0,
        todayActive: false,
        lastActiveDate: null,
      });
      return;
    }

    // ymd helper using UTC so client timezones can't fragment a streak.
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const today = ymd(new Date());
    const yesterday = ymd(new Date(Date.now() - 86_400_000));

    const todayActive = activeSet.has(today);
    // Streak anchor: today if active today, otherwise yesterday (so the
    // streak doesn't drop the moment a user wakes up — they have all day
    // to keep it). If even yesterday wasn't active, current streak = 0.
    let cursor: string | null = todayActive
      ? today
      : activeSet.has(yesterday)
        ? yesterday
        : null;

    let currentStreak = 0;
    if (cursor) {
      const cursorDate = new Date(cursor + "T00:00:00Z");
      while (activeSet.has(ymd(cursorDate))) {
        currentStreak += 1;
        cursorDate.setUTCDate(cursorDate.getUTCDate() - 1);
      }
    }

    // Longest streak: walk sorted days, count consecutive runs.
    const sortedDays = [...activeSet].sort();
    let longestStreak = 1;
    let run = 1;
    for (let i = 1; i < sortedDays.length; i += 1) {
      const prev = new Date(sortedDays[i - 1] + "T00:00:00Z");
      const curr = new Date(sortedDays[i] + "T00:00:00Z");
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / 86_400_000,
      );
      if (diffDays === 1) {
        run += 1;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    res.json({
      currentStreak,
      longestStreak,
      todayActive,
      lastActiveDate: sortedDays[sortedDays.length - 1] ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "GET /me/streak failed");
    res.status(500).json({ error: "Failed to load streak" });
  }
});

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
// Loose allow-list for the bunny avatar gallery — kept in sync with
// `data/avatars.ts` on the web. Leaving the column un-enumed in the DB lets
// us add new bunnies later without a migration; the validator here just
// stops anyone from POSTing arbitrary strings.
// Colour-keyed bunny IDs from the v1.0 design handoff. Old IDs (cute /
// whimsical / etc.) are intentionally NOT included — any user who picked
// one before the redesign will gracefully fall back to initials in the
// header until they re-pick from the new set.
const AVATAR_IDS = new Set([
  "cream",
  "gold",
  "rose",
  "midnight",
  "forest",
  "ember",
  "ink",
  "paper",
  "mauve",
  "sage",
]);
const READING_PACES = new Set(["slow", "steady", "voracious"]);
const MAX_GENRES = 12;
const MAX_PLATFORMS = 8;
const MAX_ABOUT_ME = 600;

function isFiniteInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n);
}

interface AppUserRecord {
  user_id: string;
  avatar_id?: string | null;
  default_visual_style?: string | null;
  default_visual_styles?: unknown;
  spoiler_mode?: string | null;
  reading_mode?: string | null;
  favorite_genres?: unknown;
  reading_platforms?: unknown;
  reading_pace?: string | null;
  about_me?: string | null;
  share_to_trending?: boolean | null;
  onboarded_at?: Date | string | null;
}

let appUserColumnsPromise: Promise<Set<string>> | null = null;

async function getAppUserColumns(): Promise<Set<string>> {
  if (!appUserColumnsPromise) {
    appUserColumnsPromise = pool
      .query<{
        column_name: string;
      }>(
        `
          select column_name
          from information_schema.columns
          where table_schema = current_schema()
            and table_name = 'app_users'
        `,
      )
      .then((result) => new Set(result.rows.map((row) => row.column_name)))
      .catch((err) => {
        appUserColumnsPromise = null;
        throw err;
      });
  }
  return appUserColumnsPromise;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function loadAppUser(userId: string): Promise<AppUserRecord | null> {
  const result = await pool.query<AppUserRecord>(
    `select * from app_users where user_id = $1 limit 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

async function ensureUser(userId: string): Promise<AppUserRecord> {
  const columns = await getAppUserColumns();
  if (!columns.has("user_id")) {
    throw new Error("Database schema missing required column app_users.user_id");
  }
  await pool.query(
    `insert into app_users (user_id) values ($1) on conflict (user_id) do nothing`,
    [userId],
  );
  const user = await loadAppUser(userId);
  if (!user) {
    throw new Error(`Failed to load app_users row for user ${userId}`);
  }
  return user;
}

function serializeUser(user: AppUserRecord) {
  const defaultVisualStyle =
    typeof user.default_visual_style === "string" &&
    VISUAL_STYLES.has(user.default_visual_style)
      ? user.default_visual_style
      : "fantasy-illustration";
  const spoilerMode =
    typeof user.spoiler_mode === "string" && SPOILER_MODES.has(user.spoiler_mode)
      ? user.spoiler_mode
      : "no-spoilers";
  const readingMode =
    typeof user.reading_mode === "string" && READING_MODES.has(user.reading_mode)
      ? user.reading_mode
      : "reading";
  const onboardedAt = asIsoString(user.onboarded_at);
  return {
    userId: user.user_id,
    avatarId: typeof user.avatar_id === "string" ? user.avatar_id : null,
    defaultVisualStyle,
    defaultVisualStyles: asStringArray(user.default_visual_styles),
    spoilerMode,
    readingMode,
    favoriteGenres: asStringArray(user.favorite_genres),
    readingPlatforms: asStringArray(user.reading_platforms),
    readingPace: typeof user.reading_pace === "string" ? user.reading_pace : null,
    aboutMe: typeof user.about_me === "string" ? user.about_me : "",
    shareToTrending: !!user.share_to_trending,
    onboarded: !!onboardedAt,
    onboardedAt,
  };
}

// ── /me ──────────────────────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  try {
    const user = await ensureUser((req as unknown as AuthedRequest).userId);
    res.json(serializeUser(user));
  } catch (err) {
    req.log.error({ err }, "GET /me failed");
    res.status(500).json({ error: "Failed to load user" });
  }
});

interface PatchMeBody {
  avatarId?: string | null;
  defaultVisualStyle?: string;
  defaultVisualStyles?: string[];
  spoilerMode?: string;
  readingMode?: string;
  favoriteGenres?: string[];
  readingPlatforms?: string[];
  readingPace?: string | null;
  aboutMe?: string;
  shareToTrending?: boolean;
  markOnboarded?: boolean;
}

// String-array sanitiser: trims, drops empties/duplicates (case-insensitive),
// caps length and individual tag length so we never store unbounded user
// input in the jsonb column.
function sanitizeTagArray(input: unknown, maxItems: number): string[] | null {
  if (!Array.isArray(input)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const v = raw.trim().slice(0, 60);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

function queueAppUserUpdate(
  existingColumns: Set<string>,
  assignments: string[],
  values: unknown[],
  column: string,
  value: unknown,
): void {
  if (!existingColumns.has(column)) return;
  values.push(value);
  assignments.push(`${column} = $${values.length}`);
}

router.patch("/me", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const existingColumns = await getAppUserColumns();
    await ensureUser(userId);
    const body = (req.body ?? {}) as PatchMeBody;
    const assignments: string[] = [];
    const values: unknown[] = [];
    queueAppUserUpdate(
      existingColumns,
      assignments,
      values,
      "updated_at",
      new Date(),
    );
    if (body.defaultVisualStyle !== undefined) {
      if (typeof body.defaultVisualStyle !== "string" || !VISUAL_STYLES.has(body.defaultVisualStyle)) {
        res.status(400).json({ error: "Invalid defaultVisualStyle" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "default_visual_style",
        body.defaultVisualStyle,
      );
    }
    if (body.spoilerMode !== undefined) {
      if (typeof body.spoilerMode !== "string" || !SPOILER_MODES.has(body.spoilerMode)) {
        res.status(400).json({ error: "Invalid spoilerMode" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "spoiler_mode",
        body.spoilerMode,
      );
    }
    if (body.readingMode !== undefined) {
      if (typeof body.readingMode !== "string" || !READING_MODES.has(body.readingMode)) {
        res.status(400).json({ error: "Invalid readingMode" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "reading_mode",
        body.readingMode,
      );
    }
    if (body.avatarId !== undefined) {
      if (body.avatarId === null || body.avatarId === "") {
        queueAppUserUpdate(
          existingColumns,
          assignments,
          values,
          "avatar_id",
          null,
        );
      } else if (typeof body.avatarId !== "string" || !AVATAR_IDS.has(body.avatarId)) {
        res.status(400).json({ error: "Invalid avatarId" });
        return;
      } else {
        queueAppUserUpdate(
          existingColumns,
          assignments,
          values,
          "avatar_id",
          body.avatarId,
        );
      }
    }
    if (body.defaultVisualStyles !== undefined) {
      if (!Array.isArray(body.defaultVisualStyles)) {
        res.status(400).json({ error: "defaultVisualStyles must be an array" });
        return;
      }
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const s of body.defaultVisualStyles) {
        if (typeof s !== "string" || !VISUAL_STYLES.has(s) || seen.has(s)) continue;
        seen.add(s);
        cleaned.push(s);
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "default_visual_styles",
        cleaned,
      );
    }
    if (body.favoriteGenres !== undefined) {
      const cleaned = sanitizeTagArray(body.favoriteGenres, MAX_GENRES);
      if (cleaned == null) {
        res.status(400).json({ error: "favoriteGenres must be an array" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "favorite_genres",
        cleaned,
      );
    }
    if (body.readingPlatforms !== undefined) {
      const cleaned = sanitizeTagArray(body.readingPlatforms, MAX_PLATFORMS);
      if (cleaned == null) {
        res.status(400).json({ error: "readingPlatforms must be an array" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "reading_platforms",
        cleaned,
      );
    }
    if (body.readingPace !== undefined) {
      if (body.readingPace === null || body.readingPace === "") {
        queueAppUserUpdate(
          existingColumns,
          assignments,
          values,
          "reading_pace",
          null,
        );
      } else if (typeof body.readingPace !== "string" || !READING_PACES.has(body.readingPace)) {
        res.status(400).json({ error: "Invalid readingPace" });
        return;
      } else {
        queueAppUserUpdate(
          existingColumns,
          assignments,
          values,
          "reading_pace",
          body.readingPace,
        );
      }
    }
    if (body.aboutMe !== undefined) {
      if (typeof body.aboutMe !== "string") {
        res.status(400).json({ error: "aboutMe must be a string" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "about_me",
        body.aboutMe.slice(0, MAX_ABOUT_ME),
      );
    }
    if (body.shareToTrending !== undefined) {
      if (typeof body.shareToTrending !== "boolean") {
        res.status(400).json({ error: "shareToTrending must be a boolean" });
        return;
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "share_to_trending",
        body.shareToTrending,
      );
      // Stamp the moment the user opted in so trending only surfaces
      // images they generated AFTER consenting. Toggling off clears
      // the timestamp; toggling on (when previously off) sets `now()`.
      // We unconditionally rewrite the field on every PATCH that
      // includes `shareToTrending` so the cutoff stays accurate even
      // when a user toggles off and on again.
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "share_to_trending_enabled_at",
        body.shareToTrending ? new Date() : null,
      );
    }
    if (body.markOnboarded === true) {
      if (!existingColumns.has("onboarded_at")) {
        throw new Error(
          "Database schema missing required column app_users.onboarded_at. Run `pnpm --filter @workspace/db push` against the deployed database.",
        );
      }
      queueAppUserUpdate(
        existingColumns,
        assignments,
        values,
        "onboarded_at",
        new Date(),
      );
    }
    if (assignments.length === 0) {
      const current = await ensureUser(userId);
      res.json(serializeUser(current));
      return;
    }
    values.push(userId);
    const updated = await pool.query<AppUserRecord>(
      `update app_users set ${assignments.join(", ")} where user_id = $${values.length} returning *`,
      values,
    );
    if (!updated.rows[0]) {
      throw new Error(`Failed to update app_users row for user ${userId}`);
    }
    res.json(serializeUser(updated.rows[0]));
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
    coverUrl: b.coverUrl,
    totalChapters: b.totalChapters,
    readingStatus: b.readingStatus,
    seriesName: b.seriesName,
    seriesOrder: b.seriesOrder,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

// ── Open Library cover resolver ──────────────────────────────────────────────
// Tiny fire-and-forget helper that looks a book up on Open Library and
// persists the resolved cover URL on the user_books row. Called whenever a
// row is created (or refreshed) without a coverUrl. Errors are swallowed —
// the row simply stays without a cover and the client falls back to its own
// per-browser OL lookup. Concurrent lookups for the same row are deduped via
// `pendingCoverLookups` so two simultaneous adds don't double-fire.
const pendingCoverLookups = new Set<string>();

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
}

async function resolveCoverUrlFromOpenLibrary(
  title: string,
  author: string,
): Promise<string | null> {
  const q = `${title} ${author}`.trim();
  if (!q) return null;
  const url =
    "https://openlibrary.org/search.json?limit=10" +
    `&fields=title,author_name,cover_i&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
    const docs = data.docs ?? [];
    const lowerT = title.toLowerCase();
    const lastA = author.split(" ").pop()?.toLowerCase() ?? "";
    const top =
      docs.find(
        (d) =>
          (d.title ?? "").toLowerCase() === lowerT &&
          (d.author_name ?? []).some((a) => a.toLowerCase().includes(lastA)) &&
          d.cover_i,
      ) ?? docs.find((d) => d.cover_i);
    if (!top?.cover_i) return null;
    return `https://covers.openlibrary.org/b/id/${top.cover_i}-L.jpg`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function scheduleCoverResolve(
  bookId: string,
  userId: string,
  title: string,
  author: string,
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void },
): void {
  if (pendingCoverLookups.has(bookId)) return;
  pendingCoverLookups.add(bookId);
  // Fire-and-forget — never await, never block the request response.
  void (async () => {
    try {
      const coverUrl = await resolveCoverUrlFromOpenLibrary(title, author);
      if (!coverUrl) return;
      await db
        .update(userBooksTable)
        .set({ coverUrl, updatedAt: new Date() })
        .where(
          and(
            eq(userBooksTable.id, bookId),
            eq(userBooksTable.userId, userId),
            sql`${userBooksTable.coverUrl} IS NULL`,
          ),
        );
      log.info({ bookId, title, author }, "resolved+stored cover URL");
    } catch (err) {
      log.error({ err, bookId }, "background cover resolve failed");
    } finally {
      pendingCoverLookups.delete(bookId);
    }
  })();
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
        // NOTE: Postgres rejects table-qualified column names on the LHS of
        // SET (e.g. `SET "user_scenes"."user_book_id" = ...`), so the SET
        // column must be the bare column name. Qualifying it here is what
        // was crashing every GET /me/books with a 500 — making the library
        // appear empty after adding a book.
        await tx.execute(sql`
          UPDATE ${userScenesTable}
          SET user_book_id = ${canonical.id}
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
          SET user_book_id = ${canonical.id},
              updated_at = NOW()
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

const READING_STATUSES = new Set(["reading", "want-to-read", "finished"]);

router.get("/me/books", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    await ensureUser(userId);

    const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
    if (statusFilter && !READING_STATUSES.has(statusFilter)) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }

    const conditions = [eq(userBooksTable.userId, userId)];
    if (statusFilter) {
      conditions.push(eq(userBooksTable.readingStatus, statusFilter));
    }

    let rows = await db
      .select()
      .from(userBooksTable)
      .where(and(...conditions))
      .orderBy(desc(userBooksTable.updatedAt));

    // Self-healing merge: if historical duplicates exist (the API used to
    // always insert), merge them in a transaction and re-read. The merge is
    // idempotent and only writes when duplicates are actually present, so
    // the steady-state path is just SELECT.
    if (!statusFilter) {
      const merged = await mergeDuplicateBooksForUser(userId, rows, req.log);
      if (merged) {
        rows = await db
          .select()
          .from(userBooksTable)
          .where(eq(userBooksTable.userId, userId))
          .orderBy(desc(userBooksTable.updatedAt));
      }
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
  coverUrl?: string | null;
  totalChapters?: number | null;
  readingStatus?: string;
  seriesName?: string | null;
  seriesOrder?: number | null;
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
      // Only fill coverUrl when the existing row has none — never clobber a
      // previously-resolved cover with a new client guess.
      if (
        body.coverUrl &&
        body.coverUrl.trim() &&
        !existing.coverUrl
      ) {
        patch.coverUrl = body.coverUrl.trim();
      }
      if (body.coverGradient && body.coverGradient.length > 0) patch.coverGradient = body.coverGradient;
      if (body.totalChapters != null && body.totalChapters !== existing.totalChapters) patch.totalChapters = body.totalChapters;
      if (
        body.currentChapter != null &&
        body.currentChapter > (existing.currentChapter ?? 0)
      ) {
        patch.currentChapter = body.currentChapter;
      }
      if (body.readingStatus && READING_STATUSES.has(body.readingStatus) && body.readingStatus !== existing.readingStatus) {
        patch.readingStatus = body.readingStatus;
      }
      if (body.seriesName && body.seriesName.trim() && !existing.seriesName) {
        patch.seriesName = body.seriesName.trim();
      }
      if (body.seriesOrder != null && existing.seriesOrder == null) {
        patch.seriesOrder = body.seriesOrder;
      }
      const [refreshed] = await db
        .update(userBooksTable)
        .set(patch)
        .where(eq(userBooksTable.id, existing.id))
        .returning();
      const finalRow = refreshed ?? existing;
      // Kick off a background OL lookup if we still don't have a cover for
      // this row — by definition this is dedup, so we may have an old row
      // from before coverUrl was tracked.
      if (!finalRow.coverUrl) {
        scheduleCoverResolve(finalRow.id, userId, finalRow.title, finalRow.author, req.log);
      }
      res.json({ book: serializeBook(finalRow), deduped: true });
      return;
    }

    const initialCoverUrl =
      typeof body.coverUrl === "string" && body.coverUrl.trim()
        ? body.coverUrl.trim()
        : null;
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
        coverUrl: initialCoverUrl,
        totalChapters: body.totalChapters ?? null,
        readingStatus: body.readingStatus && READING_STATUSES.has(body.readingStatus) ? body.readingStatus : "reading",
        seriesName: body.seriesName ?? null,
        seriesOrder: body.seriesOrder ?? null,
      })
      .returning();
    // If the client didn't supply a cover URL, look one up in the background
    // and persist it so the next read for any device shows the real cover
    // with zero network calls.
    if (!initialCoverUrl && created) {
      scheduleCoverResolve(created.id, userId, created.title, created.author, req.log);
    }
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
    if (body.readingStatus !== undefined && !READING_STATUSES.has(body.readingStatus)) {
      res.status(400).json({ error: "Invalid readingStatus" });
      return;
    }
    if (
      body.seriesOrder !== undefined &&
      body.seriesOrder !== null &&
      (!isFiniteInt(body.seriesOrder) || body.seriesOrder < 0)
    ) {
      res.status(400).json({ error: "seriesOrder must be a non-negative integer" });
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
      "coverUrl",
      "coverGradient",
      "readingStatus",
      "seriesName",
      "seriesOrder",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    if (body.progress !== undefined && body.progress >= 100 && body.readingStatus === undefined) {
      updates.readingStatus = "finished";
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

// Bulk delete — wipes every book (and via FK cascade, every scene) for the
// caller. Used by the "Reset library" destructive action on the account
// page. Returns the number of rows removed so the UI can show a precise
// confirmation toast.
router.delete("/me/books", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const result = await db
      .delete(userBooksTable)
      .where(eq(userBooksTable.userId, userId))
      .returning({ id: userBooksTable.id });
    res.json({ ok: true, deleted: result.length });
  } catch (err) {
    req.log.error({ err }, "DELETE /me/books (bulk) failed");
    res.status(500).json({ error: "Failed to clear library" });
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

// Delete a single scene by id, scoped to the signed-in user.
router.delete("/me/scenes/:id", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const sceneId = req.params.id;
    const result = await db
      .delete(userScenesTable)
      .where(
        and(
          eq(userScenesTable.id, sceneId),
          eq(userScenesTable.userId, userId),
        ),
      )
      .returning({ id: userScenesTable.id, userBookId: userScenesTable.userBookId });
    if (result.length === 0) {
      res.status(404).json({ error: "Scene not found" });
      return;
    }
    res.json({ ok: true, userBookId: result[0]!.userBookId });
  } catch (err) {
    req.log.error({ err }, "DELETE /me/scenes/:id failed");
    res.status(500).json({ error: "Failed to delete scene" });
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

    const targetId = target!.id;
    // Move orphan scenes to the canonical book in a single transaction.
    // The (userBookId, chapterNumber, sceneIndex) unique index means a
    // naive UPDATE crashes if the target book already has a scene at the
    // same chapter/scene slot. Drop the colliding orphan rows first, then
    // move what remains.
    const { moved, dropped } = await db.transaction(async (tx) => {
      let dropped = 0;
      if (targetId !== orphanId) {
        const conflicts = await tx
          .delete(userScenesTable)
          .where(
            and(
              eq(userScenesTable.userId, userId),
              eq(userScenesTable.userBookId, orphanId),
              sql`(${userScenesTable.chapterNumber}, ${userScenesTable.sceneIndex}) IN (
                SELECT ${userScenesTable.chapterNumber}, ${userScenesTable.sceneIndex}
                FROM ${userScenesTable}
                WHERE ${userScenesTable.userId} = ${userId}
                  AND ${userScenesTable.userBookId} = ${targetId}
              )`,
            ),
          )
          .returning({ id: userScenesTable.id });
        dropped = conflicts.length;
      }
      const moved = await tx
        .update(userScenesTable)
        .set({ userBookId: targetId })
        .where(
          and(
            eq(userScenesTable.userId, userId),
            eq(userScenesTable.userBookId, orphanId),
          ),
        )
        .returning({ id: userScenesTable.id });
      return { moved, dropped };
    });

    res.json({
      book: serializeBook(target!),
      movedSceneCount: moved.length,
      droppedDuplicateCount: dropped,
    });
  } catch (err) {
    req.log.error({ err }, "POST /me/orphan-scenes/claim failed");
    res.status(500).json({ error: "Failed to claim orphan scenes" });
  }
});

// Delete every scene saved against a given user_book_id. The endpoint is
// named "orphan-scenes" because that's the primary use case (scenes whose
// book row no longer exists), but the operation — "remove every scene row
// scoped to (userId, userBookId)" — is always safe regardless of whether
// the book row still exists. We log the latter case as a soft signal that
// the client's orphan classification disagreed with the server (e.g. a
// stale /me/books cache during a duplicate-merge), but we still honour
// the user's intent: the scenes go away. The book row itself is left
// untouched — to delete the book, callers use DELETE /me/books/:id.
router.delete("/me/orphan-scenes/:userBookId", async (req, res) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const orphanId = req.params.userBookId;

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
      req.log.info(
        { userId, userBookId: orphanId },
        "DELETE /me/orphan-scenes called for a book row that still exists — deleting scenes only, leaving book row untouched",
      );
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
