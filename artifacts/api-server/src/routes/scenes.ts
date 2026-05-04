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

// Universal safety suffix appended to every image prompt. Pushes the model
// toward stylized illustration (never photoreal) and away from recognizable
// likenesses of real or trademarked people. This is a copyright-safety
// guardrail, not a hard filter — content moderation upstream still applies.
const SAFETY_SUFFIX =
  "Stylized illustration only — no photorealistic depictions, no recognizable real people, no celebrity likeness, no trademarked logos. No text, no words, no letters, purely visual artwork.";

// Bumped whenever the SAFETY_SUFFIX or any other always-on prompt enrichment
// changes. Mixed into the image cache-key signature so an updated policy
// invalidates pre-existing renderings even when prompt + style + scene are
// otherwise identical.
const SAFETY_POLICY_VERSION = "v1";

// Cap how many bible characters we ever include in a single image prompt.
// More than this dilutes the signal and runs into model attention limits.
const MAX_ROSTER_CHARACTERS = 6;

function characterPhrase(c: CharacterProfile): string | null {
  const traits = (c.visualTraits ?? [])
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter((t) => t.length > 0);
  const desc = (c.description ?? "").trim();
  const sig = traits.length > 0 ? traits.join(", ") : desc;
  if (!sig) return null;
  return `${c.name}: ${sig}`;
}

// Articles, conjunctions, prepositions, and the most common 1-letter noise
// from GPT outputs ("a", "I"). Always dropped — these never carry identity
// signal even on their own. Single-letter character names like "Q" or "V"
// survive because they aren't in this set.
const TOKEN_GENERIC_STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "be", "by", "de", "der", "die", "do", "for",
  "from", "i", "in", "is", "it", "la", "le", "of", "on", "or", "out", "the",
  "to", "up", "with", "y",
]);

// Generic role / title nouns. These are dropped from a name's token set
// ONLY when that name has at least one other (non-stopword) token — so
// "Captain Marvel" matches on "marvel" and not the over-broad "captain",
// while a character whose only canonical name is literally "Captain"
// still indexes on "captain" because dropping it would leave nothing.
const TOKEN_ROLE_STOPWORDS = new Set([
  "captain", "king", "queen", "lord", "lady", "doctor", "dr", "mr", "mrs",
  "ms", "sir", "master", "lieutenant", "lt", "general", "officer", "prince",
  "princess", "duke", "duchess", "father", "mother", "uncle", "aunt",
]);

function rawTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !TOKEN_GENERIC_STOPWORDS.has(t));
}

/**
 * Tokenize a single name/alias into the matchable set we'll index it under.
 *
 * Strategy:
 *   - Strip generic stopwords ("the", "of", ...) unconditionally.
 *   - Strip role-titles ("captain", "doctor", ...) ONLY when the name has
 *     at least one other distinctive token. "Captain Marvel" → ["marvel"];
 *     a character literally named "Captain" → ["captain"].
 *   - Drop single-character tokens UNLESS this name is essentially a
 *     single-letter handle ("Q", "V"), in which case the 1-char token is
 *     the entire identity and must be preserved.
 */
function tokenizeNamePart(name: string): string[] {
  const all = rawTokens(name);
  if (all.length === 0) return [];
  const distinctive = all.filter((t) => !TOKEN_ROLE_STOPWORDS.has(t));
  const base = distinctive.length > 0 ? distinctive : all;
  // If the full-name shape is a single 1-char token, keep it. Otherwise
  // drop 1-char tokens to suppress noise like residue letters from
  // hyphenation / punctuation strips.
  if (base.length === 1 && base[0].length === 1) return base;
  return base.filter((t) => t.length > 1);
}

/**
 * Tokenize a free-form scene-character string from GPT. We keep
 * single-character tokens here too so a scene reference of "Q" can still
 * collide with a bible character of the same name; generic stopwords
 * already filter out "I" / "a" noise.
 */
function tokenizeSceneRef(s: string): string[] {
  return rawTokens(s);
}

/**
 * Build the character-consistency clause that gets appended to image
 * prompts. Two important departures from the old EXACT-match approach:
 *
 *  1. **Token-overlap matching.** GPT may write "Sarah" when the bible has
 *     "Sarah Chen", or "the Captain" when the bible has "Captain Vega". We
 *     now match on overlapping word tokens across name + aliases so partial
 *     references still pull in the right visual signature.
 *
 *  2. **Always-include baseline.** Even when GPT names no characters, we
 *     surface the bible's primary characters so any unnamed protagonist the
 *     model decides to render still looks consistent across scenes.
 *
 * Returns the clause text and a stable signature for cache-keying. Both are
 * derived from the SAME phrase set so two requests that produce the same
 * clause always collide on cache and two requests that produce different
 * clauses never collide.
 */
function buildCharacterRosterClause(
  bible: BookBibleRow | null,
  sceneCharacters: string[] | undefined,
): { clause: string; signature: string } {
  const emptySignature = `safety:${SAFETY_POLICY_VERSION}|roster:`;
  if (!bible) return { clause: "", signature: emptySignature };

  const chars = asCharList(bible.characterProfiles);
  if (chars.length === 0) return { clause: "", signature: emptySignature };

  // Pre-compute searchable token sets for each character (name + aliases).
  // tokenizeNamePart preserves bare single-letter handles like "Q".
  const charTokens = chars.map((c) => {
    const tokens = new Set<string>();
    for (const tok of tokenizeNamePart(c.name)) tokens.add(tok);
    for (const alias of c.aliases ?? []) {
      if (typeof alias === "string") {
        for (const tok of tokenizeNamePart(alias)) tokens.add(tok);
      }
    }
    return { c, tokens };
  });

  // Resolve which characters the scene references via token overlap.
  // tokenizeSceneRef keeps 1-char tokens (so "Q" can still match) but drops
  // generic stopwords ("a", "I", "the"...) so they don't trigger spurious
  // matches against unrelated bible entries.
  const sceneTokenSet = new Set<string>();
  for (const sc of Array.isArray(sceneCharacters) ? sceneCharacters : []) {
    for (const tok of tokenizeSceneRef(String(sc ?? ""))) sceneTokenSet.add(tok);
  }

  const matched: CharacterProfile[] = [];
  if (sceneTokenSet.size > 0) {
    for (const { c, tokens } of charTokens) {
      for (const tok of tokens) {
        if (sceneTokenSet.has(tok)) {
          matched.push(c);
          break;
        }
      }
    }
  }

  // Baseline fallback: if GPT named no recognised character, include the
  // first few bible characters anyway so a protagonist drawn without an
  // explicit name still inherits the bible's visual identity.
  const chosen = matched.length > 0 ? matched : chars.slice(0, MAX_ROSTER_CHARACTERS);

  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const c of chosen) {
    const key = c.name.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const phrase = characterPhrase(c);
    if (phrase) phrases.push(phrase);
    if (phrases.length >= MAX_ROSTER_CHARACTERS) break;
  }

  if (phrases.length === 0) {
    return { clause: "", signature: emptySignature };
  }

  const joined = phrases.join("; ");
  const clause =
    ` If any of these characters appears, render them with these EXACT consistent visual traits — same face, same hair, same wardrobe in every scene of this book: ${joined}.`;
  const signature = `safety:${SAFETY_POLICY_VERSION}|roster:${joined}`;
  return { clause, signature };
}

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
    // Trim every grounding signal BEFORE evaluating presence so a payload of
    // `excerpt: "   "` or `whatJustHappened: "\n"` is correctly recognised as
    // having no grounding (and therefore triggers per-user cache scoping).
    const trimmedExcerpt = (excerpt ?? "").trim();
    const trimmedWjh = (whatJustHappened ?? "").trim();
    const trimmedCsc = Array.isArray(currentSceneCharacters)
      ? currentSceneCharacters
          .map((c) => (typeof c === "string" ? c.trim() : ""))
          .filter((c) => c.length > 0)
      : [];
    const hasExcerpt = trimmedExcerpt.length > 0;
    // Mix bible tag + reading-context blobs into the excerpt-hash slot so the
    // cache key naturally invalidates when the bible or "what just happened"
    // changes. We avoid changing makeSceneCacheKey's signature.
    //
    // When the request has NO grounding signal at all (no excerpt, no bible,
    // no reading-context), the LLM is forced to invent scenes from training
    // memory — which for an obscure book means full hallucination. We scope
    // the cache by user in that case so two readers don't share each other's
    // hallucinations and so a follow-up generation with a real excerpt isn't
    // shadowed by the prior context-free run.
    const hasAnyGrounding =
      hasExcerpt ||
      !!bibleTag ||
      trimmedWjh.length > 0 ||
      trimmedCsc.length > 0;
    const cacheExcerptInput = [
      trimmedExcerpt,
      bibleTag ?? "",
      trimmedWjh ? `wjh:${trimmedWjh}` : "",
      trimmedCsc.length > 0 ? `csc:${trimmedCsc.join("|")}` : "",
      hasAnyGrounding ? "" : `user:${requesterId}`,
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

      // Recompute keys here using the current bible-derived roster clause so
      // cached scene bundles still produce consistency-aware image keys after
      // any bible edit. We deliberately ignore `s.imageCacheKey` from the
      // bundle for this reason.
      const enriched = await Promise.all(
        scenes.map(async (s, i) => {
          const { signature: sig } = buildCharacterRosterClause(bible, s.characters);
          const key = makeImageCacheKey({
            bookTitle,
            author,
            chapterNumber,
            sceneIndex: i,
            visualStyle,
            prompt: s.imagePrompt ?? "",
            consistencySignature: sig,
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
    const wjhSection = trimmedWjh
      ? `\nWhat the reader says just happened in their reading position (use to ground mood and recent context — do NOT extrapolate further):\n---\n${trimmedWjh.slice(0, 1200)}\n---`
      : "";
    const cscSection =
      trimmedCsc.length > 0
        ? `\nCharacters present in or near the reader's current scene: ${trimmedCsc.join(", ")}.`
        : "";

    // No-context guard. Only when the request has NO grounding signal at
    // all (no excerpt, no bible, no "what just happened", no current-scene
    // characters) do we force the model into a plot-free generic mode. If
    // ANY grounding signal is present (e.g., the reader pasted "what just
    // happened" or named the characters they're currently with), the model
    // may use that signal — we don't want this guard to suppress legitimate
    // user-supplied context.
    const noContextWarning = !hasAnyGrounding
      ? `\nIMPORTANT: You have NO chapter excerpt and NO reader-supplied story profile. You MUST NOT invent specific characters, places, ships, factions, or plot beats. Generate purely generic, mood-driven atmospheric scenes (weather, light, time of day, ambient sensory detail). Use the chapter number ONLY as a hint about pacing (early = setup mood, late = tense mood). Do NOT reference any character by name. Do NOT name any specific location. If you are tempted to write a recognisable plot detail, replace it with sensory atmosphere instead.\n`
      : "";

    const userPrompt = `Book: "${bookTitle}" by ${author}
Chapter ${chapterNumber}: "${chapterTitle}"
Spoiler strictness: ${spoilerMode}
${bibleSection ? `\n=== BOOK BIBLE (reader-confirmed context — ground every scene in this) ===\n${bibleSection}\n=== END BIBLE ===\n` : ""}${wjhSection}${cscSection}
${hasExcerpt ? `\nExcerpt from this chapter (this is the actual text the reader is on — base scenes on this, not your training memory of the book):\n---\n${trimmedExcerpt.slice(0, 3000)}\n---` : ""}${noContextWarning}

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

    const sceneListWithKeys: CachedScene[] = sceneList.map((s, i) => {
      const { signature: sig } = buildCharacterRosterClause(bible, s.characters);
      return {
        ...s,
        imageCacheKey: makeImageCacheKey({
          bookTitle,
          author,
          chapterNumber,
          sceneIndex: i,
          visualStyle,
          prompt: s.imagePrompt,
          consistencySignature: sig,
        }),
      };
    });

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
      const { clause: consistency, signature: firstSig } =
        buildCharacterRosterClause(bible, first.characters);
      const fullPrompt = `${styleDesc}. ${first.imagePrompt}${consistency} ${SAFETY_SUFFIX}`;
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
              consistencySignature: firstSig,
            },
            {
              objectPath,
              bytes: buffer.length,
              creatorUserId: (req as AuthedRequest).userId,
            },
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
  /**
   * Names of characters present in this scene. When provided alongside a
   * `bookBibleId`, the server enriches the prompt with stable visual
   * signatures from the bible so the same character looks the same across
   * every scene of the book.
   */
  sceneCharacters?: string[];
  bookBibleId?: string;
}

router.post("/scenes/image", requireAuth, async (req, res) => {
  try {
    const requesterId = (req as AuthedRequest).userId;
    const {
      prompt,
      style = "fantasy-illustration",
      bookTitle,
      author,
      chapterNumber,
      sceneIndex,
      cacheKey: providedKey,
      sceneCharacters,
      bookBibleId,
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

    // ── Bible lookup for character visual consistency ────────────────────────
    // Done BEFORE computing the cache key so the key incorporates the bible-
    // derived consistency signature. Otherwise two users with different
    // bibles (or one user before/after editing their bible) would collide on
    // the same key and serve each other's images.
    let bibleForImage: BookBibleRow | null = null;
    if (typeof bookBibleId === "string" && bookBibleId.length > 0) {
      const rows = await db
        .select()
        .from(bookBiblesTable)
        .where(eq(bookBiblesTable.id, bookBibleId))
        .limit(1);
      const candidate = rows[0] ?? null;
      if (candidate && candidate.userId === requesterId) {
        bibleForImage = candidate;
      } else if (candidate) {
        req.log.warn(
          { bookBibleId, owner: candidate.userId, requesterId },
          "image: bible ownership mismatch, ignoring",
        );
      }
    }
    const { clause: consistency, signature: consistencySignature } =
      buildCharacterRosterClause(bibleForImage, sceneCharacters);

    // SECURITY: never trust a client-provided cache key; recompute from canonical inputs.
    const cacheKey = makeImageCacheKey({
      bookTitle,
      author,
      chapterNumber,
      sceneIndex,
      visualStyle: style,
      prompt,
      consistencySignature,
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
    const fullPrompt = `${styleDesc}. ${prompt}${consistency} ${SAFETY_SUFFIX}`;
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
      {
        bookTitle,
        author,
        chapterNumber,
        sceneIndex,
        visualStyle: style,
        prompt,
        consistencySignature,
      },
      { objectPath, bytes: buffer.length, creatorUserId: requesterId },
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
