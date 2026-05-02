import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useState, useCallback } from "react";

const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}/api`;

const CACHE_PREFIX = "@jtb_scene_v1_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    `${bookTitle}_${author}_ch${chapterNumber}_${visualStyle}`.replace(/\s+/g, "_").slice(0, 80)
  );
}

async function getCached(key: string): Promise<GenerateResult | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as {
      data: GenerateResult;
      timestamp: number;
    };
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: GenerateResult) {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // ignore storage errors
  }
}

export function useGenerateScene() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (params: GenerateSceneParams): Promise<GenerateResult | null> => {
      setIsLoading(true);
      setError(null);
      const cacheKey = makeCacheKey(params);

      try {
        const cached = await getCached(cacheKey);
        if (cached) {
          setIsLoading(false);
          return cached;
        }

        const res = await fetch(`${API_BASE}/scenes/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = (await res.json()) as GenerateResult;
        await setCache(cacheKey, data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const generateImage = useCallback(
    async (prompt: string, style: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/scenes/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, style }),
        });
        if (!res.ok) throw new Error(`Image API error ${res.status}`);
        const { b64 } = (await res.json()) as { b64: string };
        return b64;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Image failed");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generate, generateImage, isLoading, error };
}
