import { Router, type IRouter } from "express";
import { openai, isRateLimitError } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { db } from "@workspace/db";
import { bookBiblesTable, type BookBibleRow } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import {
  cacheStats,
  getCachedImage,
  getSceneBundle,
  IMAGE_CACHE_VERSION,
  makeImageCacheKey,
  makeSceneCacheKey,
  objectPathToUrl,
  saveCachedImage,
  saveSceneBundle,
  SCENE_CACHE_VERSION,
  type CachedScene,
} from "../lib/sceneCache";

interface NamedEntity { name: string; description?: string }
interface CharacterProfile {
  name: string;
  role?: string;
  description?: string;
  visualTraits?: string[];
  aliases?: string[];
}

function asNamedList(v: unknown): NamedEntity[] {
  return Array.isArray(v) ? (v as NamedEntity[]).filter((x) => x && typeof x.name === "string" && x.name.length > 0) : [];
}
function asCharList(v: unknown): CharacterProfile[] {
  return Array.isArray(v) ? (v as CharacterProfile[]).filter((x) => x && typeof x.name === "string" && x.name.length > 0) : [];
}

function formatBibleContext(bible: BookBibleRow): string {
  const parts: string[] = [];
  if (bible.series) parts.push(`Series: ${bible.series}${bible.bookNumber ? ` (book ${bible.bookNumber})` : ""}`);
  const tone = Array.isArray(bible.tone) ? (bible.tone as string[]) : [];
  if (tone.length > 0) parts.push(`Tone: ${tone.join(", ")}`);
  const visualHints = Array.isArray(bible.visualStyleHints) ? (bible.visualStyleHints as string[]) : [];
  if (visualHints.length > 0) parts.push(`Visual style hints: ${visualHints.join(", ")}`);
  if (bible.settingSummary) parts.push(`Setting:\n${bible.settingSummary}`);
  if (bible.nonSpoilerSummary) parts.push(`Non-spoiler summary:\n${bible.nonSpoilerSummary}`);

  const chars = asCharList(bible.characterProfiles).slice(0, 12);
  if (chars.length > 0) {
    const lines = chars.map((c) => {
      const traits = (c.visualTraits ?? []).join(", ");
      const desc = c.description ?? c.role ?? "";
      return `- ${c.name}${c.role ? ` (${c.role})` : ""}: ${desc}${traits ? ` Visual: ${traits}.` : ""}`;
    });
    parts.push(`Characters (use these names and visual traits if they appear in this scene):\n${lines.join("\n")}`);
  }

  const locations = asNamedList(bible.locations).slice(0, 8);
  if (locations.length > 0) {
    parts.push(`Locations:\n${locations.map((l) => `- ${l.name}${l.description ? `: ${l.description}` : ""}`).join("\n")}`);
  }
  const factions = asNamedList(bible.factions).slice(0, 8);
  if (factions.length > 0) {
    parts.push(`Factions:\n${factions.map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`).join("\n")}`);
  }
  const tech = asNamedList(bible.technology).slice(0, 6);
  if (tech.length > 0) {
    parts.push(`Technology:\n${tech.map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")}`);
  }
  const ships = asNamedList(bible.ships).slice(0, 6);
  if (ships.length > 0) {
    parts.push(`Ships:\n${ships.map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`).join("\n")}`);
  }
  const species = asNamedList(bible.species).slice(0, 6);
  if (species.length > 0) {
    parts.push(`Species:\n${species.map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`).join("\n")}`);
  }

  const focusAreas = Array.isArray(bible.focusAreas) ? (bible.focusAreas as string[]) : [];
  if (focusAreas.length > 0) parts.push(`The reader specifically wants visuals to focus on: ${focusAreas.join(", ")}.`);
  if (bible.avoidNotes) parts.push(`AVOID (reader-specified constraints — strictly honor these):\n${bible.avoidNotes}`);
  if (bible.userNotes) parts.push(`Reader notes:\n${bible.userNotes}`);

  return parts.join("\n\n");
}

// Hash a bible into a short stable string for cache-keying.
// Includes contextVersion so editing the bible busts the cache.
function bibleCacheTag(bible: BookBibleRow): string {
  return `bible:${bible.id}:v${bible.contextVersion}`;
}

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

const STYLE_DESCRIPTIONS: Record<string, string> = {
  "comic-book": "bold comic book illustration with vibrant ink outlines, dynamic panel composition, halftone shading",
  watercolour: "soft delicate watercolour painting with gentle washes of translucent colour and flowing brushwork",
  "dark-cinematic": "moody cinematic film still, dramatic chiaroscuro lighting, deep atmospheric shadows, filmic grain",
  "animated-storybook": "warm illustrated storybook art, gentle palette, whimsical handcrafted details, cozy textures",
  "manga-inspired": "expressive black-and-white manga illustration, clean precise ink lines, screentone shading, dramatic angles",
  "fantasy-illustration": "rich detailed fantasy oil painting, luminous colours, intricate world-building details, painterly textures",
};

function clampSceneCount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

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

gradientColors: 2-3 hex colours that match the emotional palette of the scene.`;

interface GenerateBody {
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumber: number;
  visualStyle?: string;
  spoilerMode?: string;
  excerpt?: string;
  generateImage?: boolean;
  sceneCount?: number;
  bookBibleId?: string;
  whatJustHappened?: string;
  currentSceneCharacters?: string[];
}

router.post("/scenes/generate", requireAuth, async (req, res) => {
  try {
    const requesterId = (req as AuthedRequest).userId;
    const {
      bookTitle,
      author,
      chapterTitle,
      chapterNumber,
      visualStyle = "fantasy-illustration",
      spoilerMode = "no-spoilers",
      excerpt,
      generateImage = false,
      sceneCount: rawSceneCount,
      bookBibleId,
      whatJustHappened,
      currentSceneCharacters,
    } = req.body as GenerateBody;

    if (!bookTitle || !author) {
      res.status(400).json({ error: "bookTitle and author are required" });
      return;
    }

    // Optional: load bible for bible-aware generation. Fail-soft if missing
    // or if the requester does not own it (prevents cross-tenant leakage).
    let bible: BookBibleRow | null = null;
    if (typeof bookBibleId === "string" && bookBibleId.length > 0) {
      const rows = await db
        .select()
        .from(bookBiblesTable)
        .where(eq(bookBiblesTable.id, bookBibleId))
        .limit(1);
      const candidate = rows[0] ?? null;
      if (!candidate) {
        req.log.warn(
          { bookBibleId },
          "scenes: bible id not found, generating without bible context",
        );
      } else if (candidate.userId !== requesterId) {
        req.log.warn(
          { bookBibleId, owner: candidate.userId, requesterId },
          "scenes: bible ownership mismatch, ignoring",
        );
      } else {
        bible = candidate;
      }
    }

    const sceneCount = clampSceneCount(rawSceneCount);
    const bibleTag = bible ? bibleCacheTag(bible) : undefined;
    // Mix bible tag + reading-context blobs into the excerpt-hash slot so the
    // cache key naturally invalidates when the bible or "what just happened"
    // changes. We avoid changing makeSceneCacheKey's signature.
    const cacheExcerptInput = [
      excerpt ?? "",
      bibleTag ?? "",
      whatJustHappened ? `wjh:${whatJustHappened}` : "",
      Array.isArray(currentSceneCharacters) && currentSceneCharacters.length > 0
        ? `csc:${currentSceneCharacters.join("|")}`
        : "",
    ].filter(Boolean).join("||");

    const bundleParams = {
      bookTitle,
      author,
      chapterTitle,
      chapterNumber,
      visualStyle,
      spoilerMode,
      excerpt: cacheExcerptInput || undefined,
      sceneCount: sceneCount || undefined,
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

      const enriched = await Promise.all(
        scenes.map(async (s, i) => {
          const key =
            s.imageCacheKey ??
            makeImageCacheKey({
              bookTitle,
              author,
              chapterNumber,
              sceneIndex: i,
              visualStyle,
              prompt: s.imagePrompt ?? "",
            });
          const img = await getCachedImage(key);
          if (!img) return { ...s, imageCacheKey: key };
          return {
            ...s,
            imageCacheKey: key,
            imageUrl: objectPathToUrl(img.objectPath),
            imageGeneratedAt: img.generatedAt.toISOString(),
          };
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
    const sceneCountInstruction = sceneCount
      ? `Generate exactly ${sceneCount} scene${sceneCount === 1 ? "" : "s"}${sceneCount === 1 ? " — one strong cinematic moment that captures the heart of the passage" : ""}.`
      : "Generate 3-5 scenes that progress naturally through the chapter.";

    const bibleSection = bible ? formatBibleContext(bible) : "";
    const wjhSection = whatJustHappened
      ? `\nWhat the reader says just happened in their reading position (use to ground mood and recent context — do NOT extrapolate further):\n---\n${whatJustHappened.slice(0, 1200)}\n---`
      : "";
    const cscSection =
      Array.isArray(currentSceneCharacters) && currentSceneCharacters.length > 0
        ? `\nCharacters present in or near the reader's current scene: ${currentSceneCharacters.join(", ")}.`
        : "";

    const userPrompt = `Book: "${bookTitle}" by ${author}
Chapter ${chapterNumber}: "${chapterTitle}"
Spoiler strictness: ${spoilerMode}
${bibleSection ? `\n=== BOOK BIBLE (reader-confirmed context — ground every scene in this) ===\n${bibleSection}\n=== END BIBLE ===\n` : ""}${wjhSection}${cscSection}
${excerpt ? `\nExcerpt from this chapter (this is the actual text the reader is on — base scenes on this, not your training memory of the book):\n---\n${excerpt.slice(0, 3000)}\n---` : ""}

${sceneCountInstruction} Remember: atmosphere and setting only, no plot reveals.${bible?.avoidNotes ? ` Strictly honor the AVOID notes from the bible.` : ""}`;

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

    if (sceneListWithKeys.length > 0) {
      await saveSceneBundle(cacheKey, bundleParams, sceneListWithKeys);
      req.log.info(
        { cacheKey, sceneCount: sceneListWithKeys.length },
        "scene bundle saved",
      );
    }

    let firstImageUrl: string | null = null;
    if (generateImage && sceneListWithKeys.length > 0) {
      const first = sceneListWithKeys[0];
      const styleDesc = STYLE_DESCRIPTIONS[visualStyle] ?? "illustrated";
      const fullPrompt = `${styleDesc}. ${first.imagePrompt} No text, no words, no letters, purely visual artwork.`;
      try {
        const buffer = await generateImageBuffer(fullPrompt, "1024x1024");
        const objectPath = await objectStorage.uploadBufferAsObjectEntity(buffer, "image/png");
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
            { objectPath, bytes: buffer.length },
          );
          firstImageUrl = objectPathToUrl(objectPath);
          first.imageUrl = firstImageUrl;
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
      imageUrl: firstImageUrl,
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

router.post("/scenes/image", requireAuth, async (req, res) => {
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

    // SECURITY: never trust a client-provided cache key; recompute from canonical inputs.
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
        { providedKey, recomputedKey: cacheKey, bookTitle, chapterNumber, sceneIndex },
        "client image cacheKey did not match server-derived key — ignoring client value",
      );
    }

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cached = await getCachedImage(cacheKey);
    if (cached?.objectPath) {
      req.log.info(
        { cacheKey, bookTitle, chapterNumber, sceneIndex },
        "image cache hit",
      );
      res.json({ imageUrl: objectPathToUrl(cached.objectPath), cacheKey, cached: true });
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
      if (isRateLimitError(err)) {
        req.log.warn({ err, cacheKey }, "image generation rate-limited");
        res.status(429).json({ error: "Image generation rate-limited" });
        return;
      }
      req.log.error({ err, cacheKey }, "image generation failed");
      res.status(500).json({ error: "Image generation failed" });
      return;
    }

    const objectPath = await objectStorage.uploadBufferAsObjectEntity(buffer, "image/png");
    await saveCachedImage(
      cacheKey,
      { bookTitle, author, chapterNumber, sceneIndex, visualStyle: style, prompt },
      { objectPath, bytes: buffer.length },
    );
    req.log.info(
      { cacheKey, bytes: buffer.length, bookTitle, chapterNumber, sceneIndex, objectPath },
      "image generated and saved to App Storage",
    );

    res.json({ imageUrl: objectPathToUrl(objectPath), cacheKey, cached: false });
  } catch (err) {
    req.log.error({ err }, "Image endpoint failed");
    res.status(500).json({ error: "Image generation failed" });
  }
});

router.get("/scenes/cache/stats", requireAuth, async (req, res) => {
  try {
    const stats = await cacheStats();
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Cache stats failed");
    res.status(500).json({ error: "Cache stats failed" });
  }
});

export default router;
