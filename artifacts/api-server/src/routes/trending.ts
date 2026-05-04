import { Router } from "express";
import { db, sceneCacheTable, imageCacheTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

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
   * Always an empty array on the public endpoint. Previously we surfaced
   * up-to-4 generated scene images per trending book (drawn from the
   * cross-user image cache), which leaked one user's generations to
   * everyone hitting Discover anonymously. The Discover UI now resolves
   * a public Open Library cover client-side instead. This field is kept
   * on the type so existing clients don't break, but is intentionally
   * empty until we ship a per-user opt-in (`shareToTrending`).
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

    // Privacy: previously this route returned up to 4 sample image URLs
    // per book, sourced from the global imageCache. Because cache rows
    // span all users, that effectively published one user's generated
    // images to every anonymous Discover visitor. The aggregate counts
    // (hits, scene/image counts) are still safe to expose since they're
    // aggregated, but per-image URLs are gated until we ship a per-user
    // opt-in (`shareToTrending`). For now we return an empty array and
    // the Discover UI resolves a public Open Library cover instead.
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
        sampleImages: [],
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
