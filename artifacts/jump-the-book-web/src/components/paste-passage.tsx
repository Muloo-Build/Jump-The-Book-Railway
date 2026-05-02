import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SnapPageButton from "@/components/snap-page-button";

const PENDING_KEY = "@jtb_pending_passage";

export interface PendingPassage {
  bookId: string;
  chapter: number;
  excerpt: string;
  sceneCount: number;
  savedAt: number;
}

export function readPendingPassage(): PendingPassage | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPassage;
  } catch {
    return null;
  }
}

export function clearPendingPassage() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

interface PastePassageProps {
  bookId: string;
  chapter: number;
}

const SCENE_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "Quick", hint: "1 scene" },
  { value: 3, label: "Standard", hint: "3 scenes" },
  { value: 5, label: "Full", hint: "5 scenes" },
];

const MIN_CHARS = 200;
const MAX_CHARS = 6000;

export default function PastePassage({ bookId, chapter }: PastePassageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sceneCount, setSceneCount] = useState(3);

  const charCount = text.length;
  const tooShort = charCount > 0 && charCount < MIN_CHARS;
  const tooLong = charCount > MAX_CHARS;
  const canSubmit = charCount >= MIN_CHARS && !tooLong;

  const handleVisualize = () => {
    if (!canSubmit) return;
    const payload: PendingPassage = {
      bookId,
      chapter,
      excerpt: text.trim(),
      sceneCount,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    } catch {
      toast({
        title: "Couldn't save your passage",
        description: "Your browser blocked storage. Try a different browser.",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/generate?bookId=${bookId}&chapter=${chapter}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/40 to-transparent p-5 md:p-6 space-y-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
          <Wand2 className="w-3.5 h-3.5" />
          Paste a passage
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="font-serif text-xl font-semibold">
            Visualize this exact moment
          </h3>
          <SnapPageButton
            onText={(t) =>
              setText((prev) =>
                prev ? `${prev.replace(/\s+$/, "")}\n\n${t}` : t,
              )
            }
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Reading on Kindle or paper? Paste a paragraph, dictate it, or snap
          a photo of the page — we'll paint what's happening. No file needed.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 100))}
        placeholder="Paste a passage, or tap “Snap the page” above to capture it from a photo…"
        rows={6}
        className="resize-y min-h-[140px] text-sm leading-relaxed bg-background/40"
        aria-label="Paste a passage from your book"
      />

      <div className="flex items-center justify-between text-xs">
        <span
          className={
            tooShort
              ? "text-amber-400"
              : tooLong
                ? "text-destructive"
                : "text-muted-foreground"
          }
        >
          {charCount === 0
            ? `Paste at least ${MIN_CHARS} characters (about 1 paragraph)`
            : tooShort
              ? `${MIN_CHARS - charCount} more characters needed`
              : tooLong
                ? `${charCount - MAX_CHARS} characters over the limit`
                : `${charCount.toLocaleString()} / ${MAX_CHARS.toLocaleString()} characters`}
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          How many scenes?
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SCENE_OPTIONS.map((opt) => {
            const active = sceneCount === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSceneCount(opt.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border/50 bg-background/30 hover:bg-background/60"
                }`}
                aria-pressed={active}
              >
                <div
                  className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}
                >
                  {opt.label}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {opt.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={handleVisualize}
        disabled={!canSubmit}
        className="w-full h-12 text-base"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Visualize this passage
      </Button>
    </motion.div>
  );
}
