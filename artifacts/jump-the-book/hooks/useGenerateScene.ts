import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useState, useCallback, useRef } from "react";

const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}/api`;

const CACHE_PREFIX = "@jtb_scene_v3_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCENE_TIMEOUT_MS = 60_000;
const IMAGE_TIMEOUT_MS = 90_000;

export interface GeneratedScene {
  title: string;
  summary: string;
  narration: string;
  location: string;
  mood: string;
  characters: string[];
  gradientColors: string[];
  imagePrompt: string;
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
  stage: "writing" | "painting" | "done";
  current: number;
  total: number;
  message: string;
}

export interface ScenesWithImagesResult {
  scenes: GeneratedScene[];
  cacheKey: string;
}

function makeCacheKey(params: GenerateSceneParams) {
  const { bookTitle, author, chapterNumber, visualStyle } = params;
  return (
    CACHE_PREFIX +
    `${bookTitle}_${author}_ch${chapterNumber}_${visualStyle}`
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

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
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
   * Generate scene text + ALL scene images for a chapter.
   * Reports progress at every stage. Caches the entire bundle so reopens are instant.
   */
  const generateScenesWithImages = useCallback(
    async (
      params: GenerateSceneParams,
      onProgress?: (p: SceneProgress) => void
    ): Promise<ScenesWithImagesResult | null> => {
      cancelledRef.current = false;
      setIsWorking(true);
      setError(null);

      const cacheKey = makeCacheKey(params);
      const report = (p: SceneProgress) => {
        setProgress(p);
        onProgress?.(p);
      };

      try {
        // 1) cache hit fast-path
        const cached = await getCached<GeneratedScene[]>(cacheKey);
        if (cached && cached.length > 0 && cached.every((s) => s.imageB64)) {
          report({ stage: "done", current: cached.length, total: cached.length, message: "Ready" });
          return { scenes: cached, cacheKey };
        }

        // 2) generate text scenes
        report({ stage: "writing", current: 0, total: 0, message: "Reading the chapter…" });
        const textRes = await fetchWithTimeout(
          `${API_BASE}/scenes/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...params, generateImage: false }),
          },
          SCENE_TIMEOUT_MS
        );
        if (!textRes.ok) throw new Error(`Scene server error ${textRes.status}`);
        const { scenes: rawScenes } = (await textRes.json()) as {
          scenes: GeneratedScene[];
        };
        if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
          throw new Error("No scenes generated for this chapter");
        }

        if (cancelledRef.current) return null;

        // 3) paint each image sequentially (server can only handle a few in parallel,
        //    and sequential gives a clear "painting scene N of M" UX)
        const total = rawScenes.length;
        const finalScenes: GeneratedScene[] = [];
        for (let i = 0; i < total; i++) {
          if (cancelledRef.current) return null;
          const scene = rawScenes[i];
          report({
            stage: "painting",
            current: i + 1,
            total,
            message: `Painting scene ${i + 1} of ${total}: ${scene.title}`,
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
                }),
              },
              IMAGE_TIMEOUT_MS
            );
            if (imgRes.ok) {
              const { b64 } = (await imgRes.json()) as { b64: string };
              finalScenes.push({ ...scene, imageB64: b64 });
            } else {
              finalScenes.push({ ...scene, imageB64: null });
            }
          } catch {
            finalScenes.push({ ...scene, imageB64: null });
          }
        }

        if (cancelledRef.current) return null;

        await setCache(cacheKey, finalScenes);
        report({ stage: "done", current: total, total, message: "Ready" });
        return { scenes: finalScenes, cacheKey };
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
    []
  );

  /**
   * Read a previously generated scene bundle from cache without regenerating.
   */
  const readCachedScenes = useCallback(
    async (params: GenerateSceneParams): Promise<GeneratedScene[] | null> => {
      const key = makeCacheKey(params);
      const cached = await getCached<GeneratedScene[]>(key);
      return cached;
    },
    []
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
