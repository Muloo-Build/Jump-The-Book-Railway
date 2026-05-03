import { db, imageCacheTable, IMAGE_CACHE_VERSION } from "@workspace/db";
import { isNull, lt, or, sql } from "drizzle-orm";

async function main() {
  const before = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM image_cache WHERE object_path IS NULL OR version < ${IMAGE_CACHE_VERSION}`,
  );
  const stale = (before.rows?.[0] as { n: number } | undefined)?.n ?? 0;
  console.log(`stale image_cache rows to delete: ${stale}`);

  const deleted = await db
    .delete(imageCacheTable)
    .where(
      or(
        isNull(imageCacheTable.objectPath),
        lt(imageCacheTable.version, IMAGE_CACHE_VERSION),
      ),
    )
    .returning({ cacheKey: imageCacheTable.cacheKey });

  console.log(`deleted ${deleted.length} legacy rows`);
  console.log(
    "Now safe to run: pnpm --filter @workspace/db run push (drops image_b64, sets object_path NOT NULL)",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
