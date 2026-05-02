import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useState, useCallback, useRef } from "react";

const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}/api`;

const CACHE_PREFIX = "@jtb_scene_v4_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
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
  imageB64?: string | null;
}

export interface GenerateSceneParams {
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumber: number;
  visualStyle: string;
  spoilerMode?: string;
  excerpt?: string;
}

export interface SceneProgress {
  /**
   * - "loading-text"   → asking server for / loading scene text
   * - "checking"       → checking server image cache
   * - "painting"       → some images are still being generated
   * - "done"           → all images present (or definitively missing)
   */
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
  /** Called as soon as scene text is available (images may still be missing). */
  onScenesReady?: (scenes: GeneratedScene[], cacheKey: string) => void;
  /** Called whenever an individual image becomes available. */
  onImageReady?: (sceneIndex: number, imageB64: string) => void;
  /** Called when an individual image fails permanently (gradient fallback). */
  onImageFailed?: (sceneIndex: number) => void;
  /** Standard progress reporter for the loading screen. */
  onProgress?: (p: SceneProgress) => void;
}

function makeCacheKey(params: GenerateSceneParams) {
  const { bookTitle, author, chapterNumber, visualStyle, spoilerMode } = params;
  return (
    CACHE_PREFIX +
    `${bookTitle}_${author}_ch${chapterNumber}_${visualStyle}_${spoilerMode ?? "default"}`
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .slice(0, 100)
  );
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore quota / io errors — caching is best-effort
  }
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/** Run an array of async tasks with bounded concurrency. */
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

export function useGenerateScene() {
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState<SceneProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  /**
   * Progressive flow:
   *  1. Hit /scenes/generate → server returns scene text. If the bundle was
   *     previously generated, cached imageB64s come back inline.
   *  2. Show those scenes immediately via onScenesReady.
   *  3. For any scene still missing an image, hit /scenes/image in parallel
   *     (bounded concurrency). Each completion fires onImageReady so the UI
   *     can swap the gradient for the painted panel without a full re-render.
   *  4. When everything settles, persist the final bundle to AsyncStorage so
   *     reopens are instant and offline.
   */
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
        // 0) Local cache fast-path — fully painted bundles only
        const localCached = await getCached<GeneratedScene[]>(localKey);
        if (
          localCached &&
          localCached.length > 0 &&
          localCached.every((s) => s.imageB64)
        ) {
          callbacks.onScenesReady?.(localCached, localKey);
          report({
            stage: "done",
            current: localCached.length,
            total: localCached.length,
            message: "Ready",
          });
          return { scenes: localCached, cacheKey: localKey };
        }

        // 1) Ask server for scene text (it will return cached images if any)
        report({
          stage: "loading-text",
          current: 0,
          total: 0,
          message: "Loading saved scenes…",
        });
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
        if (rawScenes.length === 0) {
          throw new Error("No scenes generated for this chapter");
        }
        if (cancelledRef.current) return null;

        // 2) Hand the text-only scenes to the UI immediately so it can render
        //    gradients while images are still being painted.
        const workingScenes: GeneratedScene[] = rawScenes.map((s) => ({
          ...s,
          imageB64: s.imageB64 ?? null,
        }));
        callbacks.onScenesReady?.(workingScenes, textJson.cacheKey ?? localKey);

        const total = workingScenes.length;
        const cachedCount = workingScenes.filter((s) => s.imageB64).length;

        if (cachedCount === total) {
          report({
            stage: "done",
            current: total,
            total,
            message: "Image library ready",
          });
          await setCache(localKey, workingScenes);
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

        // 3) Paint missing images in parallel (bounded). Each one fires its
        //    own onImageReady so the UI updates as soon as a panel arrives.
        let completed = cachedCount;
        const tasks = workingScenes.map((scene, i) => async () => {
          if (scene.imageB64) return; // already painted server-side
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
            const { b64 } = (await imgRes.json()) as { b64: string };
            if (cancelledRef.current) return;
            workingScenes[i] = { ...workingScenes[i], imageB64: b64 };
            completed++;
            callbacks.onImageReady?.(i, b64);
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

        // Cache only fully-painted bundles locally — partial bundles will be
        // refreshed from the server on next visit (which is fast: server cache
        // hit + per-image cache hit).
        if (workingScenes.every((s) => s.imageB64)) {
          await setCache(localKey, workingScenes);
        }

        return {
          scenes: workingScenes,
          cacheKey: textJson.cacheKey ?? localKey,
        };
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

  /**
   * Read a previously generated scene bundle from local cache without
   * regenerating. Returns only fully-painted bundles.
   */
  const readCachedScenes = useCallback(
    async (params: GenerateSceneParams): Promise<GeneratedScene[] | null> => {
      const key = makeCacheKey(params);
      const cached = await getCached<GeneratedScene[]>(key);
      return cached;
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
