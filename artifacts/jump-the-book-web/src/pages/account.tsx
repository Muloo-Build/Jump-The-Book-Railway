import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Show, UserProfile, useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { BookOpen, Check, Loader2, Save, Sparkles, User } from "lucide-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SPOILER_MODE_LABELS,
  VISUAL_STYLE_LABELS,
  type SpoilerMode,
  type VisualStyle,
} from "@/data/books";
import {
  useRemoteUser,
  useUpdateRemoteUser,
} from "@/hooks/useApiLibrary";
import { useToast } from "@/hooks/use-toast";

const STYLE_PREVIEWS: Record<VisualStyle, string[]> = {
  "fantasy-illustration": ["#3a1a6e", "#9d7fe8", "#f5d27c"],
  "dark-cinematic": ["#0a0a14", "#3b2a4e", "#a48dd9"],
  "comic-book": ["#1a1a4e", "#e94e77", "#f5d27c"],
  watercolour: ["#2a4a6a", "#7ab8d5", "#f0c2c2"],
  "animated-storybook": ["#3a2a1a", "#d59f6c", "#f5e2c4"],
  "manga-inspired": ["#1a1a1a", "#5a5a5a", "#e8e8e8"],
};

const SPOILER_DESCRIPTIONS: Record<SpoilerMode, string> = {
  "no-spoilers":
    "Strict — only what you've already read. Mood, atmosphere, no plot reveals.",
  "light-guidance":
    "Hints about who and where, but no outcomes. A gentle nudge.",
  "full-companion":
    "Rich chapter context, including character arcs to help you keep up.",
};

const READING_MODES: {
  id: "reading" | "listening" | "both";
  label: string;
  icon: typeof BookOpen;
}[] = [
  { id: "reading", label: "Reading", icon: BookOpen },
  { id: "listening", label: "Listening", icon: Sparkles },
  { id: "both", label: "A bit of both", icon: User },
];

function PreferencesCard() {
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();
  const { toast } = useToast();

  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    "fantasy-illustration",
  );
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>("no-spoilers");
  const [readingMode, setReadingMode] =
    useState<"reading" | "listening" | "both">("reading");
  const [dirty, setDirty] = useState(false);

  // Hydrate the form from server prefs once they arrive. We don't reset to
  // server state after the user has begun editing, otherwise their changes
  // would get clobbered mid-edit if a refetch lands.
  useEffect(() => {
    if (!remote.data || dirty) return;
    setVisualStyle(remote.data.defaultVisualStyle);
    setSpoilerMode(remote.data.spoilerMode);
    setReadingMode(remote.data.readingMode);
  }, [remote.data, dirty]);

  const save = async () => {
    try {
      await update.mutateAsync({
        defaultVisualStyle: visualStyle,
        spoilerMode,
        readingMode,
      });
      setDirty(false);
      toast({
        title: "Preferences saved",
        description: "Your reading defaults are up to date.",
      });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  if (remote.isLoading) {
    return (
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your preferences…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-6 space-y-7">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold">
            Reading preferences
          </h2>
          <p className="text-sm text-muted-foreground">
            Defaults applied to every new book. You can still override them per
            book from the book page.
          </p>
        </div>

        {/* Visual style */}
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            Default visual style
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(VISUAL_STYLE_LABELS) as VisualStyle[]).map((s) => {
              const active = visualStyle === s;
              const colors = STYLE_PREVIEWS[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setVisualStyle(s);
                    setDirty(true);
                  }}
                  className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                    active
                      ? "border-amber-400 ring-2 ring-amber-400/40"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div
                    className="h-16 w-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
                    }}
                  />
                  <div className="px-3 py-2 bg-black/40">
                    <span className="text-xs font-medium">
                      {VISUAL_STYLE_LABELS[s]}
                    </span>
                  </div>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Spoiler mode */}
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            Spoiler protection
          </p>
          <div className="space-y-2">
            {(Object.keys(SPOILER_MODE_LABELS) as SpoilerMode[]).map((m) => {
              const active = spoilerMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setSpoilerMode(m);
                    setDirty(true);
                  }}
                  className={`block w-full text-left p-4 rounded-xl border transition-all ${
                    active
                      ? "border-amber-400 bg-amber-400/5"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        active
                          ? "border-amber-400 bg-amber-400"
                          : "border-white/30"
                      }`}
                    >
                      {active && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {SPOILER_MODE_LABELS[m]}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {SPOILER_DESCRIPTIONS[m]}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Reading mode */}
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            How you usually read
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {READING_MODES.map(({ id, label, icon: Icon }) => {
              const active = readingMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setReadingMode(id);
                    setDirty(true);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    active
                      ? "border-amber-400 bg-amber-400/5"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      active ? "text-amber-400" : "text-muted-foreground"
                    }`}
                  />
                  <div className="font-medium text-sm">{label}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
          {dirty && (
            <span className="text-xs text-amber-300/80">Unsaved changes</span>
          )}
          <Button
            onClick={save}
            disabled={!dirty || update.isPending}
            className="bg-amber-400 text-black hover:bg-amber-300 disabled:bg-amber-400/30 disabled:text-black/50"
          >
            {update.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountInner() {
  const { user } = useUser();
  const greeting = user?.firstName ?? user?.username ?? "Reader";

  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 md:py-12 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
          Account
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
          Hi, {greeting}
        </h1>
        <p className="text-muted-foreground">
          Manage how you sign in, link Google or Apple, and tune your reading
          defaults.
        </p>
      </motion.div>

      <PreferencesCard />

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold">
            Profile &amp; security
          </h2>
          <p className="text-sm text-muted-foreground">
            Update your name, email, password, link Google or Apple, and review
            active sessions.
          </p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border/50 bg-card/40">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox:
                  "!bg-transparent !shadow-none !border-0 !rounded-none w-full max-w-full",
                card: "!bg-transparent !shadow-none !border-0 !rounded-none",
                navbar: "!bg-transparent",
                pageScrollBox: "!bg-transparent",
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default function Account() {
  return (
    <Layout>
      <Show when="signed-in">
        <AccountInner />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </Layout>
  );
}
