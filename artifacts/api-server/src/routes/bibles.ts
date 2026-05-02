import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookBiblesTable,
  userBooksTable,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── Bible draft shape (matches BookBibleRow non-system fields) ───────────────
interface CharacterProfile {
  name: string;
  role: string;
  description: string;
  visualTraits: string[];
  aliases: string[];
}

interface NamedEntity {
  name: string;
  description: string;
}

interface SourceRef {
  title: string;
  url: string;
  type: string;
}

export interface BibleDraft {
  series: string | null;
  bookNumber: number | null;
  genre: string[];
  tone: string[];
  settingSummary: string;
  visualStyleHints: string[];
  nonSpoilerSummary: string;
  publisherBlurb: string;
  factions: NamedEntity[];
  locations: NamedEntity[];
  species: NamedEntity[];
  ships: NamedEntity[];
  technology: NamedEntity[];
  importantObjects: NamedEntity[];
  characterProfiles: CharacterProfile[];
  sources: SourceRef[];
}

const EMPTY_DRAFT: BibleDraft = {
  series: null,
  bookNumber: null,
  genre: [],
  tone: [],
  settingSummary: "",
  visualStyleHints: [],
  nonSpoilerSummary: "",
  publisherBlurb: "",
  factions: [],
  locations: [],
  species: [],
  ships: [],
  technology: [],
  importantObjects: [],
  characterProfiles: [],
  sources: [],
};

// ── Validation / coercion ────────────────────────────────────────────────────
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  return null;
}
function asNamedList(v: unknown): NamedEntity[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        name: asString(o.name).trim(),
        description: asString(o.description).trim(),
      };
    })
    .filter((e) => e.name.length > 0)
    .slice(0, 25);
}
function asCharacterList(v: unknown): CharacterProfile[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        name: asString(o.name).trim(),
        role: asString(o.role).trim(),
        description: asString(o.description).trim(),
        visualTraits: asStringArray(o.visualTraits).slice(0, 10),
        aliases: asStringArray(o.aliases).slice(0, 5),
      };
    })
    .filter((c) => c.name.length > 0)
    .slice(0, 25);
}
function asSourceList(v: unknown): SourceRef[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        title: asString(o.title).trim(),
        url: asString(o.url).trim(),
        type: asString(o.type).trim(),
      };
    })
    .filter((s) => s.title.length > 0)
    .slice(0, 12);
}

function coerceDraft(input: unknown): BibleDraft {
  const o = (input ?? {}) as Record<string, unknown>;
  return {
    series: asString(o.series).trim() || null,
    bookNumber: asInt(o.bookNumber),
    genre: asStringArray(o.genre).slice(0, 8),
    tone: asStringArray(o.tone).slice(0, 6),
    settingSummary: asString(o.settingSummary).trim(),
    visualStyleHints: asStringArray(o.visualStyleHints).slice(0, 8),
    nonSpoilerSummary: asString(o.nonSpoilerSummary).trim(),
    publisherBlurb: asString(o.publisherBlurb).trim(),
    factions: asNamedList(o.factions),
    locations: asNamedList(o.locations),
    species: asNamedList(o.species),
    ships: asNamedList(o.ships),
    technology: asNamedList(o.technology),
    importantObjects: asNamedList(o.importantObjects),
    characterProfiles: asCharacterList(o.characterProfiles),
    sources: asSourceList(o.sources),
  };
}

// ── GPT system prompt for bible generation ───────────────────────────────────
const BIBLE_SYSTEM = `You are a book context AI for a reading companion app. Build a structured "book bible" of public, NON-SPOILER context for a real book based on your training knowledge of publisher blurbs, fan wikis, series wikis, public reviews, and bookstore descriptions.

STRICT RULES:
- ONLY return setup-level context a reader would already know from the back cover, series fan wikis, or early chapters
- NEVER reveal: who dies, who betrays whom, plot twists, final outcomes, late-book reveals, romantic resolutions, character arcs' end states
- Characters: only those introduced early. Describe appearance and role at the START of the book. Do NOT reveal their fate.
- Locations / factions / tech: stick to what's established early in the series
- If you do NOT recognize this book with confidence, return mostly EMPTY arrays. Do NOT invent details. An honest "I don't know this book" (empty fields + a note in nonSpoilerSummary) is correct behavior.
- For long-running series, ground context in the SPECIFIC book number if given, never spoil later books in the series

OUTPUT: Return only valid JSON in this exact shape (use empty arrays/strings if unknown — NEVER fabricate):
{
  "series": "Series name or null",
  "bookNumber": 1,
  "genre": ["genre 1", "genre 2"],
  "tone": ["dark", "hopeful", "fast-paced"],
  "settingSummary": "1-3 sentences about the world / setting (no spoilers)",
  "visualStyleHints": ["visual style descriptors that would help an artist"],
  "nonSpoilerSummary": "2-4 sentences from the back-cover perspective. Setup only.",
  "publisherBlurb": "Verbatim publisher blurb if you remember it, else paraphrase non-spoiler",
  "factions": [{"name": "...", "description": "non-spoiler description"}],
  "locations": [{"name": "...", "description": "..."}],
  "species": [{"name": "...", "description": "..."}],
  "ships": [{"name": "...", "description": "..."}],
  "technology": [{"name": "...", "description": "..."}],
  "importantObjects": [{"name": "...", "description": "..."}],
  "characterProfiles": [
    {
      "name": "Character name",
      "role": "Their early-book role",
      "description": "Non-spoiler description of who they are at story start",
      "visualTraits": ["short", "red hair", "scarred", "leather jacket"],
      "aliases": ["nickname"]
    }
  ],
  "sources": [
    {"title": "Wikipedia: Book title", "url": "https://en.wikipedia.org/wiki/...", "type": "wiki"}
  ]
}`;

// ── POST /api/books/context/search ───────────────────────────────────────────
// Public — anyone can ask the AI to draft a bible. Saving requires auth.
interface ContextSearchBody {
  title?: unknown;
  author?: unknown;
  series?: unknown;
  bookNumber?: unknown;
}

router.post("/books/context/search", async (req, res) => {
  const body = (req.body ?? {}) as ContextSearchBody;
  const title = asString(body.title).trim();
  const author = asString(body.author).trim();
  const series = asString(body.series).trim();
  const bookNumber = asInt(body.bookNumber);

  if (!title || !author) {
    res.status(400).json({ error: "title and author are required" });
    return;
  }

  const userPrompt = `Build a non-spoiler book bible for:

Title: "${title}"
Author: ${author}
${series ? `Series: ${series}` : ""}
${bookNumber !== null ? `Book number in series: ${bookNumber}` : ""}

If this is a long-running series and a specific book number is given, ground the context in what's established BY THAT BOOK only — never spoil later books.
If you do not confidently recognize this exact book, return mostly empty arrays — do not invent details.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BIBLE_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const draft = coerceDraft(parsed);

    // Backfill series/bookNumber from request if AI omitted them
    if (!draft.series && series) draft.series = series;
    if (draft.bookNumber === null && bookNumber !== null)
      draft.bookNumber = bookNumber;

    req.log.info(
      {
        title,
        author,
        series: draft.series,
        characterCount: draft.characterProfiles.length,
        locationCount: draft.locations.length,
      },
      "bible draft generated",
    );

    res.json({ draft });
  } catch (err) {
    req.log.error({ err }, "bible draft generation failed");
    res
      .status(500)
      .json({ error: "Failed to build bible draft", draft: EMPTY_DRAFT });
  }
});

// ── Authed bible CRUD on /api/me/books/:bookId/bible ─────────────────────────
const meRouter: IRouter = Router();
meRouter.use(requireAuth);

async function findUserBook(userId: string, bookId: string) {
  const rows = await db
    .select()
    .from(userBooksTable)
    .where(and(eq(userBooksTable.id, bookId), eq(userBooksTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

meRouter.get("/me/books/:bookId/bible", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { bookId } = req.params;

  const book = await findUserBook(userId, bookId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const rows = await db
    .select()
    .from(bookBiblesTable)
    .where(eq(bookBiblesTable.userBookId, bookId))
    .limit(1);

  if (rows.length === 0) {
    res.json({ bible: null });
    return;
  }

  res.json({ bible: rows[0] });
});

interface SaveBibleBody {
  draft: unknown;
  userNotes?: unknown;
  focusAreas?: unknown;
  avoidNotes?: unknown;
}

meRouter.put("/me/books/:bookId/bible", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { bookId } = req.params;
  const body = (req.body ?? {}) as SaveBibleBody;

  const book = await findUserBook(userId, bookId);
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const draft = coerceDraft(body.draft);
  const userNotes = asString(body.userNotes).trim();
  const focusAreas = asStringArray(body.focusAreas).slice(0, 8);
  const avoidNotes = asString(body.avoidNotes).trim();

  const existing = await db
    .select()
    .from(bookBiblesTable)
    .where(eq(bookBiblesTable.userBookId, bookId))
    .limit(1);

  const now = new Date();
  const payload = {
    userBookId: bookId,
    userId,
    series: draft.series,
    bookNumber: draft.bookNumber,
    genre: draft.genre,
    tone: draft.tone,
    settingSummary: draft.settingSummary,
    visualStyleHints: draft.visualStyleHints,
    nonSpoilerSummary: draft.nonSpoilerSummary,
    publisherBlurb: draft.publisherBlurb,
    factions: draft.factions,
    locations: draft.locations,
    species: draft.species,
    ships: draft.ships,
    technology: draft.technology,
    importantObjects: draft.importantObjects,
    characterProfiles: draft.characterProfiles,
    sources: draft.sources,
    userNotes,
    focusAreas,
    avoidNotes,
    updatedAt: now,
  };

  if (existing.length === 0) {
    const inserted = await db
      .insert(bookBiblesTable)
      .values(payload)
      .returning();
    res.json({ bible: inserted[0] });
    return;
  }

  const updated = await db
    .update(bookBiblesTable)
    .set({ ...payload, contextVersion: (existing[0].contextVersion ?? 1) + 1 })
    .where(eq(bookBiblesTable.userBookId, bookId))
    .returning();
  res.json({ bible: updated[0] });
});

router.use(meRouter);

export default router;
