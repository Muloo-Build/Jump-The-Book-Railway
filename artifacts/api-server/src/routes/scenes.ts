import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import {
  cacheStats,
  getCachedImage,
  getSceneBundle,
  IMAGE_CACHE_VERSION,
  makeImageCacheKey,
  makeSceneCacheKey,
  saveCachedImage,
  saveSceneBundle,
  SCENE_CACHE_VERSION,
  type CachedScene,
} from "../lib/sceneCache";

const router: IRouter = Router();

const STYLE_DESCRIPTIONS: Record<string, string> = {
  "comic-book": "bold comic book illustration with vibrant ink outlines, dynamic panel composition, halftone shading",
  watercolour: "soft delicate watercolour painting with gentle washes of translucent colour and flowing brushwork",
  "dark-cinematic": "moody cinematic film still, dramatic chiaroscuro lighting, deep atmospheric shadows, filmic grain",
  "animated-storybook": "warm illustrated storybook art, gentle palette, whimsical handcrafted details, cozy textures",
  "manga-inspired": "expressive black-and-white manga illustration, clean precise ink lines, screentone shading, dramatic angles",
  "fantasy-illustration": "rich detailed fantasy oil painting, luminous colours, intricate world-building details, painterly textures",
};

const SPOILER_SYSTEM = `You are a visual story companion AI for a reading app. Generate spoiler-safe scene companion cards.

STRICT SPOILER RULES — violations ruin the app:
- NEVER reveal who dies, who survives, betrayals, twists, or final outcomes
- NEVER describe the result of confrontations, battles, or decisions
- ONLY describe what a reader observes at the start/arrival of a scene: setting, atmosphere, sensory mood
- Characters: describe appearance, emotion on their face, presence — NOT their actions or choices
- Think of it as a painting that captures the MOOD of a scene, not a plot summary

OUTPUT: Return only valid JSON in this exact shape:
{
  "scenes": [
    {
      "title": "Scene title (evocative, no spoilers)",
      "summary": "2-3 sentences describing the scene's atmosphere and setting only",
      "narration": "A single cinematic sentence — like a book's opening line for this scene (max 20 words)",
      "location": "Location name",
      "mood": "3 mood adjectives comma-separated",
      "characters": ["Character name 1", "Character name 2"],
      "gradientColors": ["#hex1", "#hex2", "#hex3"],
      "imagePrompt": "Detailed visual description for image generation: setting, lighting, atmosphere, colour palette. No plot actions."
    }
  ]
}

gradientColors: 2-3 hex colours that match the emotional palette of the scene.
Generate 3-5 scenes that progress naturally through the chapter.`;

interface GenerateBody {
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumber: number;
  visualStyle?: string;
  spoilerMode?: string;
  excerpt?: string;
  generateImage?: boolean;
}

router.post("/scenes/generate", async (req, res) => {
  try {
    const {
      bookTitle,
      author,
      chapterTitle,
      chapterNumber,
      visualStyle = "fantasy-illustration",
      spoilerMode = "no-spoilers",
      excerpt,
      generateImage = false,
    } = req.body as GenerateBody;

    if (!bookTitle || !author) {
      res.status(400).json({ error: "bookTitle and author are required" });
      return;
    }

    const bundleParams = {
      bookTitle,
      author,
      chapterTitle,
      chapterNumber,
      visualStyle,
      spoilerMode,
      excerpt,
    };
    const cacheKey = makeSceneCacheKey(bundleParams);

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cached = await getSceneBundle(cacheKey);
    if (cached) {
      const scenes = cached.scenes as CachedScene[];
      req.log.info(
        { cacheKey, sceneCount: scenes.length, bookTitle, chapterNumber, visualStyle },
        "scene cache hit",
      );

      // Attach any cached image refs so the client can skip re-fetching them
      const enriched = await Promise.all(
        scenes.map(async (s, i) => {
          if (s.imageCacheKey) {
            const img = await getCachedImage(s.imageCacheKey);
            return img
              ? { ...s, imageB64: img.imageB64, imageGeneratedAt: img.generatedAt.toISOString() }
              : s;
          }
          // Re-derive image key in case it wasn't stored on the bundle
          const imageCacheKey = makeImageCacheKey({
            bookTitle,
            author,
            chapterNumber,
            sceneIndex: i,
            visualStyle,
            prompt: s.imagePrompt ?? "",
          });
          const img = await getCachedImage(imageCacheKey);
          return img
            ? {
                ...s,
                imageCacheKey,
                imageB64: img.imageB64,
                imageGeneratedAt: img.generatedAt.toISOString(),
              }
            : { ...s, imageCacheKey };
        }),
      );

      res.json({
        scenes: enriched,
        cacheKey,
        cached: true,
        sceneCacheVersion: SCENE_CACHE_VERSION,
        imageCacheVersion: IMAGE_CACHE_VERSION,
      });
      return;
    }

    req.log.info(
      { cacheKey, bookTitle, chapterNumber, visualStyle, spoilerMode },
      "scene cache miss — generating",
    );

    // ── Generate scene text via GPT ──────────────────────────────────────────
    const userPrompt = `Book: "${bookTitle}" by ${author}
Chapter ${chapterNumber}: "${chapterTitle}"
Spoiler strictness: ${spoilerMode}
${excerpt ? `\nExcerpt from this chapter:\n---\n${excerpt.slice(0, 3000)}\n---` : ""}

Generate visual scene companion cards for this chapter. Remember: atmosphere and setting only, no plot reveals.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SPOILER_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { scenes?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { scenes: [] };
    }

    const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    const sceneList: CachedScene[] = rawScenes.map((s) => {
      const obj = (s as Record<string, unknown>) ?? {};
      return {
        title: String(obj.title ?? ""),
        summary: String(obj.summary ?? ""),
        narration: String(obj.narration ?? ""),
        location: String(obj.location ?? ""),
        mood: String(obj.mood ?? ""),
        characters: Array.isArray(obj.characters) ? (obj.characters as string[]) : [],
        gradientColors: Array.isArray(obj.gradientColors)
          ? (obj.gradientColors as string[])
          : ["#1a1a4e", "#3a1a6e", "#9d7fe8"],
        imagePrompt: String(obj.imagePrompt ?? ""),
      };
    });

    // Pre-compute the image cache key for each scene so the bundle is self-describing
    const sceneListWithKeys: CachedScene[] = sceneList.map((s, i) => ({
      ...s,
      imageCacheKey: makeImageCacheKey({
        bookTitle,
        author,
        chapterNumber,
        sceneIndex: i,
        visualStyle,
        prompt: s.imagePrompt,
      }),
    }));

    // Persist the text bundle right away so the client can show it immediately
    if (sceneListWithKeys.length > 0) {
      await saveSceneBundle(cacheKey, bundleParams, sceneListWithKeys);
      req.log.info(
        { cacheKey, sceneCount: sceneListWithKeys.length },
        "scene bundle saved",
      );
    }

    // Optional: paint the first image inline (kept for backwards compatibility)
    let imageB64: string | null = null;
    if (generateImage && sceneListWithKeys.length > 0) {
      const first = sceneListWithKeys[0];
      const styleDesc = STYLE_DESCRIPTIONS[visualStyle] ?? "illustrated";
      const fullPrompt = `${styleDesc}. ${first.imagePrompt} No text, no words, no letters, purely visual artwork.`;
      try {
        const buffer = await generateImageBuffer(fullPrompt, "1024x1024");
        const generated = buffer.toString("base64");
        imageB64 = generated;
        if (first.imageCacheKey) {
          await saveCachedImage(
            first.imageCacheKey,
            {
              bookTitle,
              author,
              chapterNumber,
              sceneIndex: 0,
              visualStyle,
              prompt: first.imagePrompt,
            },
            generated,
          );
          first.imageB64 = generated;
          // Re-save the bundle now that scene 0 carries an image hint
          await saveSceneBundle(cacheKey, bundleParams, sceneListWithKeys);
        }
      } catch (imgErr) {
        req.log.warn({ imgErr }, "Inline image generation failed");
      }
    }

    res.json({
      scenes: sceneListWithKeys,
      cacheKey,
      cached: false,
      imageB64,
      sceneCacheVersion: SCENE_CACHE_VERSION,
      imageCacheVersion: IMAGE_CACHE_VERSION,
    });
  } catch (err) {
    req.log.error({ err }, "Scene generation failed");
    res.status(500).json({ error: "Scene generation failed" });
  }
});

interface ImageBody {
  prompt: string;
  style?: string;
  bookTitle?: string;
  author?: string;
  chapterNumber?: number;
  sceneIndex?: number;
  cacheKey?: string;
}

router.post("/scenes/image", async (req, res) => {
  try {
    const {
      prompt,
      style = "fantasy-illustration",
      bookTitle,
      author,
      chapterNumber,
      sceneIndex,
      cacheKey: providedKey,
    } = req.body as ImageBody;

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }
    if (
      !bookTitle ||
      !author ||
      typeof chapterNumber !== "number" ||
      typeof sceneIndex !== "number"
    ) {
      res.status(400).json({
        error:
          "bookTitle, author, chapterNumber and sceneIndex are required to scope the cache key",
      });
      return;
    }

    // SECURITY: never trust a client-provided cache key. The cache is shared
    // across all users, so a malicious client could otherwise overwrite or
    // poison another book's cached image. We always recompute the key from
    // the canonical (book, chapter, sceneIndex, style, prompt) tuple. If the
    // client sent a key, it must match — otherwise we ignore it entirely.
    const cacheKey = makeImageCacheKey({
      bookTitle,
      author,
      chapterNumber,
      sceneIndex,
      visualStyle: style,
      prompt,
    });
    if (providedKey && providedKey !== cacheKey) {
      req.log.warn(
        {
          providedKey,
          recomputedKey: cacheKey,
          bookTitle,
          chapterNumber,
          sceneIndex,
        },
        "client image cacheKey did not match server-derived key — ignoring client value",
      );
    }

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cached = await getCachedImage(cacheKey);
    if (cached) {
      req.log.info(
        { cacheKey, bookTitle, chapterNumber, sceneIndex },
        "image cache hit",
      );
      res.json({ b64: cached.imageB64, cacheKey, cached: true });
      return;
    }

    req.log.info(
      { cacheKey, bookTitle, chapterNumber, sceneIndex, style },
      "image cache miss — generating",
    );

    // ── Generate ─────────────────────────────────────────────────────────────
    const styleDesc = STYLE_DESCRIPTIONS[style] ?? "illustrated artwork";
    const fullPrompt = `${styleDesc}. ${prompt} No text, no words, no letters, purely visual artwork.`;
    let buffer: Buffer;
    try {
      buffer = await generateImageBuffer(fullPrompt, "1024x1024");
    } catch (err) {
      req.log.error({ err, cacheKey }, "image generation failed");
      res.status(500).json({ error: "Image generation failed" });
      return;
    }
    const b64 = buffer.toString("base64");

    await saveCachedImage(
      cacheKey,
      {
        bookTitle,
        author,
        chapterNumber,
        sceneIndex,
        visualStyle: style,
        prompt,
      },
      b64,
    );
    req.log.info(
      { cacheKey, bytes: buffer.length, bookTitle, chapterNumber, sceneIndex },
      "image generated and saved",
    );

    res.json({ b64, cacheKey, cached: false });
  } catch (err) {
    req.log.error({ err }, "Image endpoint failed");
    res.status(500).json({ error: "Image generation failed" });
  }
});

// ── Dev/admin: inspect cache ──────────────────────────────────────────────
router.get("/scenes/cache/stats", async (req, res) => {
  try {
    const stats = await cacheStats();
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Cache stats failed");
    res.status(500).json({ error: "Cache stats failed" });
  }
});

export default router;
