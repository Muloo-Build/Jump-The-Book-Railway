import { Router } from "express";
import { db, sceneCacheTable, imageCacheTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { objectPathToUrl } from "../lib/sceneCache";

const router = Router();

interface TrendingBook {
  bookTitle: string;
  author: string;
  totalSceneHits: number;
  totalImageHits: number;
  totalHits: number;
  uniqueChapters: number;
  sceneCount: number;
  imageCount: number;
  /**
   * Sample image URLs from generations whose creator opted into sharing
   * via the per-user `shareToTrending` flag on `app_users`. Restricted
   * to opt-in users only — never surfaces a generation from a user who
   * left the default (off). Empty when no opted-in user has generated
   * for this book yet, in which case the Discover UI falls back to a
   * public Open Library cover. Capped at 4 per book.
   */
  sampleImages: string[];
  lastAccessedAt: string;
}

router.get("/trending", async (_req, res) => {
  try {
    const sceneStats = await db
      .select({
        bookTitle: sceneCacheTable.bookTitle,
        author: sceneCacheTable.author,
        totalHits: sql<number>`coalesce(sum(${sceneCacheTable.hitCount}), 0)`.as("total_hits"),
        uniqueChapters: sql<number>`count(distinct ${sceneCacheTable.chapterNumber})`.as("unique_chapters"),
        sceneCount: sql<number>`count(*)`.as("scene_count"),
        lastAccessed: sql<string>`max(${sceneCacheTable.lastAccessedAt})`.as("last_accessed"),
      })
      .from(sceneCacheTable)
      .groupBy(sceneCacheTable.bookTitle, sceneCacheTable.author);

    const imageStats = await db
      .select({
        bookTitle: imageCacheTable.bookTitle,
        author: imageCacheTable.author,
        totalHits: sql<number>`coalesce(sum(${imageCacheTable.hitCount}), 0)`.as("total_hits"),
        imageCount: sql<number>`count(*)`.as("image_count"),
        lastAccessed: sql<string>`max(${imageCacheTable.lastAccessedAt})`.as("last_accessed"),
      })
      .from(imageCacheTable)
      .groupBy(imageCacheTable.bookTitle, imageCacheTable.author);

    // Per-book sample images. Eligibility (all must hold):
    //   1. The image's creator has `share_to_trending = true`.
    //   2. The image was generated AFTER the creator opted in
    //      (`ic.generated_at >= au.share_to_trending_enabled_at`), so
    //      flipping the toggle on does NOT retroactively expose images
    //      generated while the toggle was off.
    // The window function caps at 4 per (book, author) so a single
    // chatty creator can't flood any one card's gallery.
    const sharedRows = await db.execute<{
      book_title: string;
      author: string;
      object_path: string;
    }>(sql`
      SELECT book_title, author, object_path
      FROM (
        SELECT
          ic.book_title,
          ic.author,
          ic.object_path,
          ic.generated_at,
          ROW_NUMBER() OVER (
            PARTITION BY ic.book_title, ic.author
            ORDER BY ic.generated_at DESC
          ) AS rn
        FROM image_cache ic
        INNER JOIN app_users au
          ON au.user_id = ic.creator_user_id
        WHERE au.share_to_trending = true
          AND au.share_to_trending_enabled_at IS NOT NULL
          AND ic.generated_at >= au.share_to_trending_enabled_at
      ) ranked
      WHERE rn <= 4
      ORDER BY book_title, author, generated_at DESC
    `);

    const sharedSampleMap = new Map<string, string[]>();
    for (const r of sharedRows.rows) {
      const key = `${r.book_title}|||${r.author}`;
      const arr = sharedSampleMap.get(key) ?? [];
      const url = objectPathToUrl(r.object_path);
      if (url) arr.push(url);
      sharedSampleMap.set(key, arr);
    }

    const imageStatsMap = new Map(
      imageStats.map((r) => [`${r.bookTitle}|||${r.author}`, r]),
    );

    const sceneStatsMap = new Map(
      sceneStats.map((r) => [`${r.bookTitle}|||${r.author}`, r]),
    );

    const allKeys = new Set([
      ...sceneStats.map((r) => `${r.bookTitle}|||${r.author}`),
      ...imageStats.map((r) => `${r.bookTitle}|||${r.author}`),
    ]);

    const books: TrendingBook[] = [...allKeys].map((key) => {
      const scene = sceneStatsMap.get(key);
      const img = imageStatsMap.get(key);
      const bookTitle = scene?.bookTitle ?? img!.bookTitle;
      const author = scene?.author ?? img!.author;
      const totalSceneHits = Number(scene?.totalHits) || 0;
      const totalImageHits = Number(img?.totalHits) || 0;
      return {
        bookTitle,
        author,
        totalSceneHits,
        totalImageHits,
        totalHits: totalSceneHits + totalImageHits,
        uniqueChapters: Number(scene?.uniqueChapters) || 0,
        sceneCount: Number(scene?.sceneCount) || 0,
        imageCount: Number(img?.imageCount) || 0,
        sampleImages: sharedSampleMap.get(key) ?? [],
        lastAccessedAt: (img?.lastAccessed ?? scene?.lastAccessed ?? new Date().toISOString()).toString(),
      };
    });

    books.sort((a, b) => {
      const hitDiff = b.totalHits - a.totalHits;
      if (hitDiff !== 0) return hitDiff;
      return b.sceneCount - a.sceneCount;
    });

    const top = books.slice(0, 20);

    res.json({ books: top, totalBooks: books.length });
  } catch (err) {
    logger.error({ err }, "Failed to fetch trending data");
    res.status(500).json({ error: "Failed to fetch trending data" });
  }
});

export default router;
