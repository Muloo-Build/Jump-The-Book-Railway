import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAskCompanion, type CompanionTurn } from "@/hooks/useCompanion";

interface BookCompanionProps {
  bookId: string;
  bookTitle: string;
  currentChapter: number;
  hasBible: boolean;
}

const STARTER_PROMPTS = [
  "Who are the main characters so far?",
  "Tell me about the setting.",
  "What factions or groups should I know?",
  "Refresh me on what's happened so far.",
];

/**
 * Spoiler-safe AI reading companion. Lives on the book detail page. The
 * conversation is per-mount (not persisted) — readers tend to ask one or two
 * focused questions, then move on. Persisting would also raise the spoiler
 * surface area (history travels across chapter changes). Server caps history
 * to the last 12 turns and validates every request.
 */
export default function BookCompanion({
  bookId,
  bookTitle,
  currentChapter,
  hasBible,
}: BookCompanionProps) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<CompanionTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ask = useAskCompanion();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest turn whenever the transcript grows. Done with
  // useEffect (not inside the submit handler) so we also catch the assistant
  // reply that lands asynchronously.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns.length, ask.isPending]);

  const submit = async (questionRaw: string) => {
    const question = questionRaw.trim();
    if (!question || ask.isPending) return;
    setError(null);
    const userTurn: CompanionTurn = { role: "user", content: question };
    const nextTurns: CompanionTurn[] = [...turns, userTurn];
    setTurns(nextTurns);
    setDraft("");
    try {
      const res = await ask.mutateAsync({
        bookId,
        question,
        // Send the prior turns (before this user message). The server already
        // adds the new question itself, so don't double-send it.
        history: turns,
      });
      setTurns([...nextTurns, { role: "assistant", content: res.answer }]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(msg);
      // Roll back the user turn so they can retry without re-typing.
      setTurns(turns);
      setDraft(question);
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-[var(--jtb-accent-hi)]" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[var(--jtb-accent-hi)] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Reading Companion
            </div>
            <h3 className="font-serif text-xl font-semibold">
              Ask anything about{" "}
              <span className="italic">{bookTitle}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Spoiler-safe up to chapter {currentChapter}. I'll never reveal
              what's ahead.
              {!hasBible && (
                <>
                  {" "}
                  <span className="text-[var(--jtb-accent-hi)]/80">
                    Tip: add a Book Bible above for richer answers.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {turns.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => submit(p)}
                className="text-left text-sm px-3 py-2.5 rounded-md border border-border/50 bg-card/40 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-colors text-muted-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="space-y-4 max-h-[420px] overflow-y-auto pr-1 -mr-1"
          >
            {turns.map((turn, i) => (
              <div
                key={i}
                className={
                  turn.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    turn.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-primary/15 text-foreground text-sm border border-primary/30"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 bg-card/60 text-foreground text-sm border border-border/40 leading-relaxed whitespace-pre-wrap"
                  }
                >
                  {turn.content}
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 bg-card/60 border border-border/40 text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(draft);
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={ask.isPending}
            maxLength={1000}
            placeholder={
              turns.length === 0
                ? "Ask the companion…"
                : "Ask a follow-up…"
            }
            className="flex-1 h-10 rounded-md border border-border/50 bg-card/40 px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={ask.isPending || !draft.trim()}
            className="bg-primary text-primary-foreground hover:brightness-110 h-10"
          >
            {ask.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
