import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * One-time backfill: link saved scene rows whose image_url is NULL to the
 * already-generated image bytes in App Storage by joining via image_cache_key.
 *
 * Cause: before the generate-page fix, if the user navigated away from the
 * "Visualizing chapter…" screen before all images finished painting, the
 * onImageReady callback short-circuited on `active=false` and never wrote the
 * resolved imageUrl back to user_scenes. The bytes still saved to App Storage
 * (and image_cache); only the link was missing.
 *
 * Idempotent: only updates rows with image_url IS NULL where a matching
 * image_cache row exists. Safe to run on every cold start.
 */
export async function backfillSceneImageUrls(): Promise<void> {
  try {
    const result = await db.execute(sql`
      UPDATE user_scenes us
      SET image_url = '/api/storage/objects/' || substring(ic.object_path from 10)
      FROM image_cache ic
      WHERE ic.cache_key = us.image_cache_key
        AND us.image_url IS NULL
        AND us.image_cache_key IS NOT NULL
        AND ic.object_path LIKE '/objects/%'
    `);
    const updated = (result as { rowCount?: number | null }).rowCount ?? 0;
    if (updated > 0) {
      logger.info({ updated }, "backfilled scene image URLs from image_cache");
    }
  } catch (err) {
    logger.error({ err }, "scene image URL backfill failed");
  }
}
