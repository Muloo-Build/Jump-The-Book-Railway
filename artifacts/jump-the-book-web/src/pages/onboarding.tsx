import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles, Check, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VISUAL_STYLE_LABELS,
  SPOILER_MODE_LABELS,
  type SpoilerMode,
  type VisualStyle,
} from "@/data/books";
import {
  useRemoteUser,
  useUpdateRemoteUser,
} from "@/hooks/useApiLibrary";

const STYLE_PREVIEWS: Record<VisualStyle, string[]> = {
  "fantasy-illustration": ["#3a1a6e", "#9d7fe8", "#f5d27c"],
  "dark-cinematic": ["#0a0a14", "#3b2a4e", "#a48dd9"],
  "comic-book": ["#1a1a4e", "#e94e77", "#f5d27c"],
  watercolour: ["#2a4a6a", "#7ab8d5", "#f0c2c2"],
  "animated-storybook": ["#3a2a1a", "#d59f6c", "#f5e2c4"],
  "manga-inspired": ["#1a1a1a", "#5a5a5a", "#e8e8e8"],
};

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();

  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    "fantasy-illustration",
  );
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>("no-spoilers");
  const [readingMode, setReadingMode] = useState<"reading" | "listening" | "both">(
    "reading",
  );

  // If already onboarded, send them to library
  useEffect(() => {
    if (remote.data?.onboarded) setLocation("/library");
  }, [remote.data?.onboarded, setLocation]);

  // Seed defaults from existing settings
  useEffect(() => {
    if (remote.data) {
      setVisualStyle(remote.data.defaultVisualStyle);
      setSpoilerMode(remote.data.spoilerMode);
      setReadingMode(remote.data.readingMode);
    }
  }, [remote.data]);

  const greeting = useMemo(() => {
    const name = user?.firstName ?? user?.username ?? null;
    return name ? `Welcome, ${name}` : "Welcome to Jump the Book";
  }, [user]);

  const finish = async () => {
    await update.mutateAsync({
      defaultVisualStyle: visualStyle,
      spoilerMode,
      readingMode,
      markOnboarded: true,
    });
    setLocation("/library");
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground dark relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-amber-400/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12 md:py-20">
        <header className="flex items-center gap-3 mb-12">
          <Compass className="w-7 h-7 text-amber-400" />
          <span className="font-serif text-xl font-bold tracking-tight">
            Jump the Book
          </span>
        </header>

        <div className="flex items-center gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-amber-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section
              key="step-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-400/80">
                  Step 1 of 3
                </p>
                <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                  {greeting}
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Pick a visual style for your scenes. We'll use this whenever you
                  open a new chapter — and you can always change it per book.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.keys(VISUAL_STYLE_LABELS) as VisualStyle[]).map((s) => {
                  const active = visualStyle === s;
                  const colors = STYLE_PREVIEWS[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setVisualStyle(s)}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                        active
                          ? "border-amber-400 ring-2 ring-amber-400/40"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div
                        className="h-24 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
                        }}
                      />
                      <div className="px-3 py-2.5 bg-black/40 backdrop-blur-sm">
                        <span className="text-sm font-medium">
                          {VISUAL_STYLE_LABELS[s]}
                        </span>
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  size="lg"
                  onClick={() => setStep(1)}
                  className="bg-amber-400 text-black hover:bg-amber-300"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="step-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-400/80">
                  Step 2 of 3
                </p>
                <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                  How spoiler-shy are you?
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  We tune the storytelling around your reading position so nothing
                  ahead is given away.
                </p>
              </div>

              <div className="space-y-3">
                {(Object.keys(SPOILER_MODE_LABELS) as SpoilerMode[]).map((m) => {
                  const active = spoilerMode === m;
                  const desc = {
                    "no-spoilers":
                      "Strict — only what you've already read. Mood, atmosphere, no plot reveals.",
                    "light-guidance":
                      "Hints about who and where, but no outcomes. A gentle nudge.",
                    "full-companion":
                      "Rich chapter context, including character arcs to help you keep up.",
                  }[m];
                  return (
                    <button
                      key={m}
                      onClick={() => setSpoilerMode(m)}
                      className={`block w-full text-left p-5 rounded-xl border transition-all ${
                        active
                          ? "border-amber-400 bg-amber-400/5"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            active
                              ? "border-amber-400 bg-amber-400"
                              : "border-white/30"
                          }`}
                        >
                          {active && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-base mb-1">
                            {SPOILER_MODE_LABELS[m]}
                          </div>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setStep(2)}
                  className="bg-amber-400 text-black hover:bg-amber-300"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-400/80">
                  Step 3 of 3
                </p>
                <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                  How do you read?
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Helps us pick the right pacing for scene cards.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    { id: "reading", label: "Reading", icon: BookOpen },
                    { id: "listening", label: "Listening", icon: Sparkles },
                    { id: "both", label: "A bit of both", icon: Compass },
                  ] as const
                ).map(({ id, label, icon: Icon }) => {
                  const active = readingMode === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setReadingMode(id)}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        active
                          ? "border-amber-400 bg-amber-400/5"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 mb-3 ${
                          active ? "text-amber-400" : "text-muted-foreground"
                        }`}
                      />
                      <div className="font-medium">{label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 p-5 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    Every scene you generate is saved to your personal library.
                    Your collection grows the more you read — and you can revisit
                    any chapter's artwork from any device.
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={finish}
                  disabled={update.isPending}
                  className="bg-amber-400 text-black hover:bg-amber-300"
                >
                  {update.isPending ? "Setting up…" : "Open my library"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
