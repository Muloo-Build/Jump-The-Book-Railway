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
  AVATAR_OPTIONS,
  avatarUrl,
  type AvatarId,
} from "@/data/avatars";
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

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();

  // Bunny is the new step 1. We seed from remote, but only treat it as
  // "picked" if it's a v1.0 colour-keyed id — old IDs are intentionally
  // dropped so users get re-onboarded onto the new gallery.
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
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
      const known = AVATAR_OPTIONS.find((a) => a.id === remote.data?.avatarId);
      setAvatarId(known?.id ?? null);
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
      // Only send the avatar if they actually picked one — saves us a
      // server-side validation flap if they skipped step 1.
      ...(avatarId ? { avatarId } : {}),
    });
    setLocation("/library");
  };

  const stepLabel = (i: number) => `Step ${i + 1} of ${TOTAL_STEPS}`;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground dark relative overflow-hidden">
      {/* Ambient glow — gold tint from the v1.0 palette */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12 md:py-20">
        <header className="flex items-center gap-3 mb-12">
          <img
            src={`${import.meta.env.BASE_URL}logo-mark.svg`}
            alt=""
            className="w-7 h-7 rounded-md"
          />
          <span className="font-serif text-xl tracking-tight">
            <span className="italic text-primary">Jump</span>{" "}
            <span className="text-muted-foreground/70 text-[0.85em]">the</span>{" "}
            Book
          </span>
        </header>

        <div className="flex items-center gap-2 mb-10">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 0 — Pick your bunny */}
          {step === 0 && (
            <motion.section
              key="step-bunny"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="jtb-eyebrow">{stepLabel(0)}</p>
                <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight">
                  {greeting}
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                  Pick your bunny. It'll sit on your shelf and follow you
                  through the app — you can change colour later.
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {AVATAR_OPTIONS.map((opt) => {
                  const active = avatarId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAvatarId(opt.id)}
                      className={`group relative aspect-square overflow-hidden rounded-xl border transition-all flex items-center justify-center bg-card/40 ${
                        active
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border/40 hover:border-border"
                      }`}
                      aria-label={opt.name}
                      title={opt.name}
                    >
                      <img
                        src={avatarUrl(opt.id) ?? undefined}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/55 backdrop-blur-sm px-2 py-1 text-[10px] uppercase tracking-[0.15em] font-mono text-center text-white/85">
                        {opt.name}
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_0_2px_rgba(8,8,11,0.6)]">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground/80">
                You can skip this for now and pick one from your account page
                later.
              </p>

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={() => setStep(1)}
                  className="bg-primary text-primary-foreground hover:brightness-110 font-semibold"
                >
                  {avatarId ? "Continue" : "Skip for now"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}

          {/* STEP 1 — Visual style */}
          {step === 1 && (
            <motion.section
              key="step-style"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="jtb-eyebrow">{stepLabel(1)}</p>
                <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight">
                  Pick a visual style.
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                  We'll use this whenever you open a new chapter — and you can
                  always change it per book.
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
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border/40 hover:border-border"
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
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
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
                  className="bg-primary text-primary-foreground hover:brightness-110 font-semibold"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}

          {/* STEP 2 — Spoiler mode */}
          {step === 2 && (
            <motion.section
              key="step-spoiler"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="jtb-eyebrow">{stepLabel(2)}</p>
                <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight">
                  How spoiler-shy are you?
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                  We tune the storytelling around your reading position so
                  nothing ahead is given away.
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
                          ? "border-primary bg-primary/5"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            active
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}
                        >
                          {active && (
                            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
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
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setStep(3)}
                  className="bg-primary text-primary-foreground hover:brightness-110 font-semibold"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}

          {/* STEP 3 — Reading mode */}
          {step === 3 && (
            <motion.section
              key="step-mode"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="jtb-eyebrow">{stepLabel(3)}</p>
                <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight">
                  How do you read?
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-xl">
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
                          ? "border-primary bg-primary/5"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 mb-3 ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <div className="font-medium">{label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border/40 p-5 bg-card/40">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    Every scene you generate is saved to your personal library.
                    Your collection grows the more you read — and you can
                    revisit any chapter's artwork from any device.
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={finish}
                  disabled={update.isPending}
                  className="bg-primary text-primary-foreground hover:brightness-110 font-semibold"
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
