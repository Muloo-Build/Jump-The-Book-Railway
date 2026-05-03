import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookBiblesTable,
  userBooksTable,
  type BookBibleRow,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

interface CharacterProfile {
  name: string;
  role?: string;
  description?: string;
  visualTraits?: string[];
  aliases?: string[];
}

interface NamedEntity {
  name: string;
  description?: string;
}

function asNamedList(v: unknown): NamedEntity[] {
  return Array.isArray(v)
    ? (v as NamedEntity[]).filter(
        (x) => x && typeof x.name === "string" && x.name.length > 0,
      )
    : [];
}

function asCharList(v: unknown): CharacterProfile[] {
  return Array.isArray(v)
    ? (v as CharacterProfile[]).filter(
        (x) => x && typeof x.name === "string" && x.name.length > 0,
      )
    : [];
}

// Build a compact, spoiler-bounded context string the model can use to answer
// reader questions. We deliberately mirror the bible-context formatting from
// scenes.ts so behaviour stays consistent — a question and an image
// generation see the same world.
function formatBibleForCompanion(bible: BookBibleRow): string {
  const parts: string[] = [];
  if (bible.series)
    parts.push(
      `Series: ${bible.series}${bible.bookNumber ? ` (book ${bible.bookNumber})` : ""}`,
    );
  const tone = Array.isArray(bible.tone) ? (bible.tone as string[]) : [];
  if (tone.length > 0) parts.push(`Tone: ${tone.join(", ")}`);
  if (bible.settingSummary) parts.push(`Setting:\n${bible.settingSummary}`);
  if (bible.nonSpoilerSummary)
    parts.push(`Non-spoiler summary:\n${bible.nonSpoilerSummary}`);

  const chars = asCharList(bible.characterProfiles).slice(0, 16);
  if (chars.length > 0) {
    const lines = chars.map((c) => {
      const traits = (c.visualTraits ?? []).join(", ");
      const aliases = (c.aliases ?? []).join(", ");
      const desc = c.description ?? c.role ?? "";
      return `- ${c.name}${c.role ? ` (${c.role})` : ""}: ${desc}${
        traits ? ` Visual: ${traits}.` : ""
      }${aliases ? ` Aliases: ${aliases}.` : ""}`;
    });
    parts.push(`Characters:\n${lines.join("\n")}`);
  }

  const locations = asNamedList(bible.locations).slice(0, 12);
  if (locations.length > 0) {
    parts.push(
      `Locations:\n${locations
        .map((l) => `- ${l.name}${l.description ? `: ${l.description}` : ""}`)
        .join("\n")}`,
    );
  }
  const factions = asNamedList(bible.factions).slice(0, 10);
  if (factions.length > 0) {
    parts.push(
      `Factions:\n${factions
        .map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`)
        .join("\n")}`,
    );
  }
  const tech = asNamedList(bible.technology).slice(0, 8);
  if (tech.length > 0) {
    parts.push(
      `Technology:\n${tech
        .map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`)
        .join("\n")}`,
    );
  }
  const ships = asNamedList(bible.ships).slice(0, 6);
  if (ships.length > 0) {
    parts.push(
      `Ships:\n${ships
        .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`)
        .join("\n")}`,
    );
  }
  const species = asNamedList(bible.species).slice(0, 6);
  if (species.length > 0) {
    parts.push(
      `Species:\n${species
        .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`)
        .join("\n")}`,
    );
  }
  const objects = asNamedList(bible.importantObjects).slice(0, 8);
  if (objects.length > 0) {
    parts.push(
      `Important objects:\n${objects
        .map((o) => `- ${o.name}${o.description ? `: ${o.description}` : ""}`)
        .join("\n")}`,
    );
  }

  if (bible.avoidNotes)
    parts.push(`Reader-specified things to AVOID mentioning:\n${bible.avoidNotes}`);

  return parts.join("\n\n");
}

const SYSTEM_PROMPT = `You are the Reading Companion inside Jump the Book — a warm, well-read friend who helps a reader understand the world of the book they're currently reading WITHOUT spoiling anything.

ABSOLUTE RULES (in order of priority):
1. SPOILER SAFETY. The reader is on a specific chapter. NEVER reveal anything that happens after their current chapter. NEVER reveal: who dies, who betrays whom, plot twists, late-book reveals, romantic resolutions, character fates, the ending, or any event that happens later in the book or series.
2. STAY GROUNDED. Only answer using the BOOK BIBLE context provided below and your training knowledge of the EARLY part of this book. If the bible has empty fields and you don't confidently know the book, say so honestly — never fabricate names, places, or events.
3. STAY ON-TOPIC. You only discuss this book and its world. If the user asks about anything else (other books, real-world topics, your own nature), politely redirect to the book.
4. STAY CONCISE. 2–4 short paragraphs maximum. No headings, no bullet lists unless the user explicitly asks for a list. Speak like a friend, not a wiki.
5. STAY IN VOICE. Warm, curious, slightly literary. Never start with "As an AI…" or similar disclaimers.

If a reader asks something you can't safely answer (e.g. "what happens at the end?" or "does X die?"), gently decline with one sentence and offer something you CAN help with — describing a character's introduction, explaining a faction, painting the setting, etc.`;

// ── POST /api/me/books/:bookId/companion ─────────────────────────────────────
interface CompanionMessage {
  role: "user" | "assistant";
  content: string;
}
interface CompanionBody {
  question?: unknown;
  history?: unknown;
}

router.post(
  "/me/books/:bookId/companion",
  requireAuth,
  async (req, res) => {
    const userId = (req as unknown as AuthedRequest).userId;
    const bookId = String(req.params.bookId ?? "");
    const body = (req.body ?? {}) as CompanionBody;

    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      res.status(400).json({ error: "question is required" });
      return;
    }
    if (question.length > 1000) {
      res
        .status(400)
        .json({ error: "Please keep your question under 1000 characters." });
      return;
    }

    // Sanitise + cap chat history. We keep the last 6 turns (12 messages) so
    // the prompt stays small and the model doesn't drift across sessions.
    const rawHistory: CompanionMessage[] = Array.isArray(body.history)
      ? (body.history as unknown[])
          .map((m) => {
            const o = (m ?? {}) as Record<string, unknown>;
            const role = o.role === "assistant" ? "assistant" : "user";
            const content =
              typeof o.content === "string" ? o.content.slice(0, 4000) : "";
            return content ? { role, content } : null;
          })
          .filter((m): m is CompanionMessage => m !== null)
          .slice(-12)
      : [];

    // Look up the book + bible. The book must belong to the caller.
    let book;
    try {
      const rows = await db
        .select()
        .from(userBooksTable)
        .where(
          and(eq(userBooksTable.id, bookId), eq(userBooksTable.userId, userId)),
        )
        .limit(1);
      book = rows[0] ?? null;
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "22P02") {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      throw err;
    }
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const bibleRows = await db
      .select()
      .from(bookBiblesTable)
      .where(eq(bookBiblesTable.userBookId, bookId))
      .limit(1);
    const bible = bibleRows[0];

    const bibleSection = bible ? formatBibleForCompanion(bible) : "";

    const userPromptHeader = `Book: "${book.title}" by ${book.author}
Reader is currently on chapter ${book.currentChapter ?? 1}${
      book.totalChapters ? ` of ${book.totalChapters}` : ""
    }.
${
  bibleSection
    ? `\n=== BOOK BIBLE (your only source of truth — do not contradict it) ===\n${bibleSection}\n=== END BIBLE ===\n`
    : "\nNo book bible is available for this book yet. Be especially careful — only answer if you confidently know the book from training, and refuse to speculate.\n"
}
ANSWER THIS READER QUESTION (spoiler-safe up to chapter ${
      book.currentChapter ?? 1
    }):`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] =
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPromptHeader },
        ...rawHistory,
        { role: "user", content: question },
      ];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 800,
        messages,
      });
      const answer =
        completion.choices[0]?.message?.content?.trim() ??
        "I'm not sure how to answer that without risking spoilers — could you ask something else about the world or characters?";

      req.log.info(
        {
          userId,
          bookId,
          questionLen: question.length,
          historyTurns: rawHistory.length,
          hasBible: !!bible,
          chapter: book.currentChapter,
        },
        "companion answered",
      );

      res.json({ answer });
    } catch (err) {
      req.log.error({ err, bookId }, "companion request failed");
      res.status(500).json({
        error:
          "The companion couldn't answer just now. Please try again in a moment.",
      });
    }
  },
);

export default router;
