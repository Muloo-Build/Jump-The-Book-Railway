import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  sceneCacheTable,
  imageCacheTable,
  SCENE_CACHE_VERSION,
  IMAGE_CACHE_VERSION,
  type SceneCacheRow,
  type ImageCacheRow,
} from "@workspace/db";

export { SCENE_CACHE_VERSION, IMAGE_CACHE_VERSION };

export interface CachedScene {
  title: string;
  summary: string;
  narration: string;
  location: string;
  mood: string;
  characters: string[];
  gradientColors: string[];
  imagePrompt: string;
  imageCacheKey?: string;
  imageUrl?: string | null;
  imageGeneratedAt?: string | null;
}

export interface SceneBundleParams {
  bookTitle: string;
  author: string;
  chapterNumber: number;
  chapterTitle: string;
  visualStyle: string;
  spoilerMode: string;
  excerpt?: string;
  sceneCount?: number;
}

export interface ImageKeyParams {
  bookTitle: string;
  author: string;
  chapterNumber: number;
  sceneIndex: number;
  visualStyle: string;
  prompt: string;
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function hashExcerpt(excerpt: string | undefined): string {
  if (!excerpt || excerpt.trim().length === 0) return "noexcerpt";
  return sha(excerpt.trim()).slice(0, 16);
}

export function makeSceneCacheKey(p: SceneBundleParams): string {
  const raw = [
    `v${SCENE_CACHE_VERSION}`,
    p.bookTitle.trim().toLowerCase(),
    p.author.trim().toLowerCase(),
    String(p.chapterNumber),
    p.visualStyle,
    p.spoilerMode,
    // Excerpt and scene count are part of the request identity — different
    // excerpts or counts must not collide with cached results from a previous
    // run on the same book/chapter.
    `ex:${hashExcerpt(p.excerpt)}`,
    `n:${typeof p.sceneCount === "number" ? p.sceneCount : "default"}`,
  ].join("|");
  return `scene_v${SCENE_CACHE_VERSION}_${sha(raw).slice(0, 32)}`;
}

export function makeImageCacheKey(p: ImageKeyParams): string {
  const promptHash = sha(p.prompt.trim()).slice(0, 16);
  const raw = [
    `v${IMAGE_CACHE_VERSION}`,
    p.bookTitle.trim().toLowerCase(),
    p.author.trim().toLowerCase(),
    String(p.chapterNumber),
    String(p.sceneIndex),
    p.visualStyle,
    promptHash,
  ].join("|");
  return `image_v${IMAGE_CACHE_VERSION}_${sha(raw).slice(0, 32)}`;
}

export async function getSceneBundle(
  cacheKey: string,
): Promise<SceneCacheRow | null> {
  const rows = await db
    .select()
    .from(sceneCacheTable)
    .where(eq(sceneCacheTable.cacheKey, cacheKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveSceneBundle(
  cacheKey: string,
  p: SceneBundleParams,
  scenes: CachedScene[],
  source = "gpt",
): Promise<void> {
  await db
    .insert(sceneCacheTable)
    .values({
      cacheKey,
      version: SCENE_CACHE_VERSION,
      bookTitle: p.bookTitle,
      author: p.author,
      chapterNumber: p.chapterNumber,
      chapterTitle: p.chapterTitle,
      visualStyle: p.visualStyle,
      spoilerMode: p.spoilerMode,
      excerptHash: hashExcerpt(p.excerpt),
      scenes,
      source,
    })
    .onConflictDoUpdate({
      target: sceneCacheTable.cacheKey,
      set: {
        scenes,
        generatedAt: new Date(),
      },
    });
}

export async function getCachedImage(
  cacheKey: string,
): Promise<ImageCacheRow | null> {
  const rows = await db
    .select()
    .from(imageCacheTable)
    .where(eq(imageCacheTable.cacheKey, cacheKey))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Convert a stored objectPath ("/objects/<namespace>/<id>") to a public URL
 * the web client can load. The api-server is mounted under `/api`, so the
 * storage GET route is `/api/storage/objects/<namespace>/<id>`.
 */
export function objectPathToUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  if (!objectPath.startsWith("/objects/")) return objectPath;
  const tail = objectPath.slice("/objects/".length);
  return `/api/storage/objects/${tail}`;
}

export async function saveCachedImage(
  cacheKey: string,
  p: ImageKeyParams,
  opts: { objectPath: string; bytes: number },
): Promise<void> {
  const promptHash = sha(p.prompt.trim()).slice(0, 16);
  await db
    .insert(imageCacheTable)
    .values({
      cacheKey,
      version: IMAGE_CACHE_VERSION,
      bookTitle: p.bookTitle,
      author: p.author,
      chapterNumber: p.chapterNumber,
      sceneIndex: p.sceneIndex,
      visualStyle: p.visualStyle,
      promptHash,
      objectPath: opts.objectPath,
      bytes: opts.bytes,
    })
    .onConflictDoUpdate({
      target: imageCacheTable.cacheKey,
      set: {
        objectPath: opts.objectPath,
        bytes: opts.bytes,
        generatedAt: new Date(),
      },
    });
}

export async function cacheStats() {
  const sceneRows = await db.select().from(sceneCacheTable);
  const imageRows = await db.select().from(imageCacheTable);
  const totalImageBytes = imageRows.reduce((acc, r) => acc + (r.bytes ?? 0), 0);
  return {
    sceneCacheVersion: SCENE_CACHE_VERSION,
    imageCacheVersion: IMAGE_CACHE_VERSION,
    sceneBundles: sceneRows.length,
    images: imageRows.length,
    totalImageBytes,
    recentBundles: sceneRows
      .sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
      )
      .slice(0, 20)
      .map((r) => ({
        cacheKey: r.cacheKey,
        bookTitle: r.bookTitle,
        author: r.author,
        chapterNumber: r.chapterNumber,
        chapterTitle: r.chapterTitle,
        visualStyle: r.visualStyle,
        spoilerMode: r.spoilerMode,
        sceneCount: Array.isArray(r.scenes) ? r.scenes.length : 0,
        generatedAt: r.generatedAt,
      })),
    recentImages: imageRows
      .sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
      )
      .slice(0, 20)
      .map((r) => ({
        cacheKey: r.cacheKey,
        bookTitle: r.bookTitle,
        chapterNumber: r.chapterNumber,
        sceneIndex: r.sceneIndex,
        visualStyle: r.visualStyle,
        bytes: r.bytes,
        generatedAt: r.generatedAt,
      })),
  };
}
