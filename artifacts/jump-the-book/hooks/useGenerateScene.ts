import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useState, useCallback } from "react";

const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}/api`;

const CACHE_PREFIX = "@jtb_scene_v2_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCENE_TIMEOUT_MS = 45_000; // 45s for text generation
const IMAGE_TIMEOUT_MS = 60_000; // 60s for image generation

export interface GeneratedScene {
  title: string;
  summary: string;
  narration: string;
  location: string;
  mood: string;
  characters: string[];
  gradientColors: string[];
  imagePrompt: string;
}

export interface GenerateSceneParams {
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumber: number;
  visualStyle: string;
  spoilerMode?: string;
  excerpt?: string;
  generateImage?: boolean;
}

interface GenerateResult {
  scenes: GeneratedScene[];
  imageB64: string | null;
}

function makeCacheKey(params: GenerateSceneParams) {
  const { bookTitle, author, chapterNumber, visualStyle } = params;
  return (
    CACHE_PREFIX +
    `${bookTitle}_${author}_ch${chapterNumber}_${visualStyle}`
      .replace(/\s+/g, "_")
      .slice(0, 80)
  );
}

function makeImageCacheKey(prompt: string, style: string) {
  return CACHE_PREFIX + "img_" + `${style}_${prompt}`.replace(/\s+/g, "_").slice(0, 60);
}

async function getCached<T>(key: string, ttl = CACHE_TTL_MS): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - timestamp > ttl) return null;
    return data;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore
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
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Generate scene TEXT only (fast, ~10-15s). Never generates image inline.
  const generate = useCallback(
    async (params: GenerateSceneParams): Promise<GenerateResult | null> => {
      // Always disable inline image generation — images are generated per-scene
      const textParams = { ...params, generateImage: false };

      setIsLoading(true);
      setError(null);
      setLoadingMessage("Asking the AI to write your scenes…");
      const cacheKey = makeCacheKey(textParams);

      try {
        const cached = await getCached<GenerateResult>(cacheKey);
        if (cached) {
          setIsLoading(false);
          setLoadingMessage("");
          return cached;
        }

        const res = await fetchWithTimeout(
          `${API_BASE}/scenes/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(textParams),
          },
          SCENE_TIMEOUT_MS
        );

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = (await res.json()) as GenerateResult;
        await setCache(cacheKey, data);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error && err.name === "AbortError"
            ? "Took too long — please try again"
            : err instanceof Error
            ? err.message
            : "Generation failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
        setLoadingMessage("");
      }
    },
    []
  );

  // Generate image for a single scene (slower, ~30-45s). Called separately.
  const generateImage = useCallback(
    async (prompt: string, style: string): Promise<string | null> => {
      setIsImageLoading(true);
      setError(null);
      const cacheKey = makeImageCacheKey(prompt, style);

      try {
        const cached = await getCached<string>(cacheKey);
        if (cached) return cached;

        const res = await fetchWithTimeout(
          `${API_BASE}/scenes/image`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, style }),
          },
          IMAGE_TIMEOUT_MS
        );

        if (!res.ok) throw new Error(`Image server error ${res.status}`);
        const { b64 } = (await res.json()) as { b64: string };
        await setCache(cacheKey, b64);
        return b64;
      } catch (err) {
        const msg =
          err instanceof Error && err.name === "AbortError"
            ? "Image took too long — try again"
            : err instanceof Error
            ? err.message
            : "Image generation failed";
        setError(msg);
        return null;
      } finally {
        setIsImageLoading(false);
      }
    },
    []
  );

  return { generate, generateImage, isLoading, isImageLoading, error, loadingMessage };
}
