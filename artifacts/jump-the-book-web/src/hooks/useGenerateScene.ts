import { useCallback, useRef, useState } from "react";

const API_BASE = "/api";

const CACHE_PREFIX = "@jtb_scene_v5_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCENE_TIMEOUT_MS = 60_000;
const IMAGE_TIMEOUT_MS = 90_000;
const IMAGE_CONCURRENCY = 2;

export interface GeneratedScene {
  title: string;
  summary: string;
  narration: string;
  location: string;
  mood: string;
  characters: string[];
  gradientColors: string[];
  imagePrompt: string;
  imageCacheKey?: string | null;
  /**
   * URL the browser can load directly. Either a relative `/api/storage/...`
   * URL (server-generated images) or a static `/scenes/...` path (demo books).
   */
  imageUrl?: string | null;
}

export interface GenerateSceneParams {
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumber: number;
  visualStyle: string;
  spoilerMode?: string;
  excerpt?: string;
  sceneCount?: number;
  bookBibleId?: string;
  whatJustHappened?: string;
  currentSceneCharacters?: string[];
}

export interface SceneProgress {
  stage: "loading-text" | "checking" | "painting" | "done";
  current: number;
  total: number;
  message: string;
}

export interface ScenesWithImagesResult {
  scenes: GeneratedScene[];
  cacheKey: string;
}

export interface ProgressiveCallbacks {
  onScenesReady?: (scenes: GeneratedScene[], cacheKey: string) => void;
  onImageReady?: (sceneIndex: number, imageUrl: string) => void;
  onImageFailed?: (sceneIndex: number) => void;
  onProgress?: (p: SceneProgress) => void;
}

function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function makeCacheKey(params: GenerateSceneParams) {
  const {
    bookTitle,
    author,
    chapterNumber,
    visualStyle,
    spoilerMode,
    excerpt,
    sceneCount,
    bookBibleId,
    whatJustHappened,
    currentSceneCharacters,
  } = params;
  // Different excerpts, bibles, and reading-context inputs must produce
  // different cache keys — otherwise editing the bible or pasting a new
  // passage returns the previous run.
  const excerptKey = excerpt && excerpt.trim() ? djb2Hash(excerpt.trim()) : "noex";
  const countKey = typeof sceneCount === "number" ? `n${sceneCount}` : "ndefault";
  const bibleKey = bookBibleId ? `b${bookBibleId.slice(0, 8)}` : "nob";
  const ctxParts = [
    whatJustHappened?.trim() ?? "",
    Array.isArray(currentSceneCharacters) ? currentSceneCharacters.join("|") : "",
  ].filter(Boolean).join("||");
  const ctxKey = ctxParts ? djb2Hash(ctxParts) : "noctx";
  return (
    CACHE_PREFIX +
    `${bookTitle}_${author}_ch${chapterNumber}_${visualStyle}_${spoilerMode ?? "default"}_${countKey}_${excerptKey}_${bibleKey}_${ctxKey}`
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .slice(0, 140)
  );
}

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    /* quota errors are non-fatal */
  }
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Progressive scene + image generation, mirroring the mobile hook.
 * Returns scene text first, then paints missing images in parallel.
 */
export function useGenerateScene() {
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState<SceneProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const generateScenesWithImages = useCallback(
    async (
      params: GenerateSceneParams,
      cb?: ProgressiveCallbacks | ((p: SceneProgress) => void),
    ): Promise<ScenesWithImagesResult | null> => {
      cancelledRef.current = false;
      setIsWorking(true);
      setError(null);

      const callbacks: ProgressiveCallbacks =
        typeof cb === "function" ? { onProgress: cb } : (cb ?? {});

      const localKey = makeCacheKey(params);
      const report = (p: SceneProgress) => {
        setProgress(p);
        callbacks.onProgress?.(p);
      };

      try {
        // Local fast-path: previously fully painted bundle
        const localCached = getCached<GeneratedScene[]>(localKey);
        if (localCached && localCached.length > 0 && localCached.every((s) => s.imageUrl)) {
          callbacks.onScenesReady?.(localCached, localKey);
          report({
            stage: "done",
            current: localCached.length,
            total: localCached.length,
            message: "Ready",
          });
          return { scenes: localCached, cacheKey: localKey };
        }

        report({ stage: "loading-text", current: 0, total: 0, message: "Loading saved scenes…" });
        const textRes = await fetchWithTimeout(
          `${API_BASE}/scenes/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...params, generateImage: false }),
          },
          SCENE_TIMEOUT_MS,
        );
        if (!textRes.ok) throw new Error(`Scene server error ${textRes.status}`);
        const textJson = (await textRes.json()) as {
          scenes: GeneratedScene[];
          cacheKey?: string;
          cached?: boolean;
        };
        const rawScenes = Array.isArray(textJson.scenes) ? textJson.scenes : [];
        if (rawScenes.length === 0) throw new Error("No scenes generated for this chapter");
        if (cancelledRef.current) return null;

        const workingScenes: GeneratedScene[] = rawScenes.map((s) => ({
          ...s,
          imageUrl: s.imageUrl ?? null,
        }));
        callbacks.onScenesReady?.(workingScenes, textJson.cacheKey ?? localKey);

        const total = workingScenes.length;
        const cachedCount = workingScenes.filter((s) => s.imageUrl).length;

        if (cachedCount === total) {
          report({ stage: "done", current: total, total, message: "Image library ready" });
          setCache(localKey, workingScenes);
          return { scenes: workingScenes, cacheKey: textJson.cacheKey ?? localKey };
        }

        report({
          stage: "checking",
          current: cachedCount,
          total,
          message:
            cachedCount > 0
              ? `Loaded ${cachedCount} of ${total} from your library`
              : "Generating visual story…",
        });

        let completed = cachedCount;
        const tasks = workingScenes.map((scene, i) => async () => {
          if (scene.imageUrl) return;
          if (cancelledRef.current) return;
          report({
            stage: "painting",
            current: completed,
            total,
            message: `Creating image ${completed + 1} of ${total}…`,
          });
          try {
            const imgRes = await fetchWithTimeout(
              `${API_BASE}/scenes/image`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: scene.imagePrompt,
                  style: params.visualStyle,
                  bookTitle: params.bookTitle,
                  author: params.author,
                  chapterNumber: params.chapterNumber,
                  sceneIndex: i,
                  cacheKey: scene.imageCacheKey ?? undefined,
                }),
              },
              IMAGE_TIMEOUT_MS,
            );
            if (!imgRes.ok) {
              callbacks.onImageFailed?.(i);
              return;
            }
            const { imageUrl } = (await imgRes.json()) as { imageUrl: string };
            if (cancelledRef.current) return;
            workingScenes[i] = { ...workingScenes[i], imageUrl };
            completed++;
            callbacks.onImageReady?.(i, imageUrl);
            report({
              stage: completed === total ? "done" : "painting",
              current: completed,
              total,
              message:
                completed === total
                  ? "All images ready"
                  : `Image ${completed} of ${total} ready`,
            });
          } catch {
            callbacks.onImageFailed?.(i);
          }
        });

        await runWithConcurrency(tasks, IMAGE_CONCURRENCY);
        if (cancelledRef.current) return null;

        report({
          stage: "done",
          current: completed,
          total,
          message: completed === total ? "All images ready" : "Ready",
        });

        if (workingScenes.every((s) => s.imageUrl)) {
          setCache(localKey, workingScenes);
        }

        return { scenes: workingScenes, cacheKey: textJson.cacheKey ?? localKey };
      } catch (err) {
        const msg =
          err instanceof Error && err.name === "AbortError"
            ? "That took too long — please try again"
            : err instanceof Error
              ? err.message
              : "Generation failed";
        setError(msg);
        return null;
      } finally {
        setIsWorking(false);
      }
    },
    [],
  );

  const readCachedScenes = useCallback(
    (params: GenerateSceneParams): GeneratedScene[] | null => {
      const key = makeCacheKey(params);
      return getCached<GeneratedScene[]>(key);
    },
    [],
  );

  return {
    generateScenesWithImages,
    readCachedScenes,
    cancel,
    isWorking,
    progress,
    error,
  };
}
