import { useEffect, useRef, useState } from "react";
import { Redirect } from "wouter";
import { Show, UserProfile, useUser } from "@clerk/react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Check,
  Loader2,
  Sparkles,
  Star,
  Trash2,
  User,
  X,
  Plus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  SPOILER_MODE_LABELS,
  VISUAL_STYLE_LABELS,
  type SpoilerMode,
  type VisualStyle,
} from "@/data/books";
import { AVATAR_OPTIONS, avatarUrl, type AvatarId } from "@/data/avatars";
import {
  GENRE_TAGS,
  PLATFORM_TAGS,
  READING_PACE_LABELS,
  type ReadingPace,
} from "@/data/profile";
import {
  useRemoteUser,
  useUpdateRemoteUser,
} from "@/hooks/useApiLibrary";
import { useLibrary } from "@/lib/library";
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

const READING_PACES: ReadingPace[] = ["slow", "steady", "voracious"];

const MAX_GENRES = 12;
const MAX_PLATFORMS = 8;
const MAX_ABOUT_ME = 600;

/** Tiny inline status pip for auto-save feedback in the card header. */
function SaveStatus({
  state,
}: {
  state: "idle" | "saving" | "saved" | "error";
}) {
  if (state === "saving")
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="text-xs text-emerald-300/90 inline-flex items-center gap-1.5">
        <Check className="w-3 h-3" />
        Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="text-xs text-red-300/90">Couldn't save — retrying</span>
    );
  return null;
}

/**
 * Picker for the bunny avatar. Selecting a bunny PATCHes /me right away —
 * no debounce because it's a single click and users expect the new avatar
 * everywhere (including the header) instantly. The "remove" action just
 * sets `avatarId: null` so the header falls back to initials / Clerk photo.
 */
function AvatarPickerCard({
  selected,
  onSelect,
}: {
  selected: AvatarId | null;
  onSelect: (id: AvatarId | null) => Promise<void>;
}) {
  const [busy, setBusy] = useState<AvatarId | "clear" | null>(null);
  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold">Pick your bunny</h2>
          <p className="text-sm text-muted-foreground">
            Choose an icon for your reader profile. It shows up in the header
            and on shared scenes.
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {AVATAR_OPTIONS.map((opt) => {
            const active = selected === opt.id;
            const isBusy = busy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy !== null}
                onClick={async () => {
                  if (active) return;
                  setBusy(opt.id);
                  try {
                    await onSelect(opt.id);
                  } finally {
                    setBusy(null);
                  }
                }}
                aria-pressed={active}
                aria-label={`Select ${opt.name} bunny avatar`}
                title={opt.blurb}
                className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all bg-card/40 ${
                  active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border/40 hover:border-border"
                } ${busy && !isBusy ? "opacity-50" : ""}`}
              >
                <img
                  src={avatarUrl(opt.id) ?? ""}
                  alt={opt.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/55 backdrop-blur-sm px-2 py-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-white/85 block text-center">
                    {opt.name}
                  </span>
                </div>
                {active && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_0_2px_rgba(8,8,11,0.6)]">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                {isBusy && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--jtb-accent-hi)]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {selected && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("clear");
              try {
                await onSelect(null);
              } finally {
                setBusy(null);
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground/80 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Use my photo or initials instead
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Reusable chip-style multi-select. Pre-set tags can be toggled, and users
 * can add their own custom tag (capped at `max` items total). Calling
 * `onChange` with the new array is the only side-effect — persistence is
 * handled by the parent (debounced PATCH).
 */
function ChipMultiSelect({
  preset,
  selected,
  onChange,
  max,
  placeholder,
  customLabel,
}: {
  preset: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max: number;
  placeholder: string;
  customLabel: string;
}) {
  const [draft, setDraft] = useState("");
  // Display the union of preset tags + any custom tags the user has saved
  // that aren't in the preset list. Order: preset first (stable), then
  // custom in selection order so they don't jump around as you toggle.
  const presetSet = new Set(preset.map((p) => p.toLowerCase()));
  const customs = selected.filter((s) => !presetSet.has(s.toLowerCase()));

  const isSelected = (tag: string) =>
    selected.some((s) => s.toLowerCase() === tag.toLowerCase());

  const toggle = (tag: string) => {
    if (isSelected(tag)) {
      onChange(selected.filter((s) => s.toLowerCase() !== tag.toLowerCase()));
    } else if (selected.length < max) {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const v = draft.trim().slice(0, 60);
    if (!v) return;
    if (isSelected(v)) {
      setDraft("");
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, v]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {preset.map((tag) => {
          const active = isSelected(tag);
          const disabled = !active && selected.length >= max;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "border-primary bg-primary/15 text-[var(--jtb-accent-hi)]"
                  : disabled
                    ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                    : "border-border/70 text-foreground/80 hover:border-border hover:text-foreground"
              }`}
            >
              {tag}
              {active && <Check className="inline w-3 h-3 ml-1.5 -mr-0.5" />}
            </button>
          );
        })}
        {customs.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-primary bg-primary/15 text-[var(--jtb-accent-hi)]"
          >
            {tag}
            <button
              type="button"
              onClick={() => toggle(tag)}
              className="hover:text-white"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          maxLength={60}
          placeholder={placeholder}
          disabled={selected.length >= max}
          className="flex-1 h-9 rounded-md border border-border/40 bg-card/30 px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustom}
          disabled={!draft.trim() || selected.length >= max}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {customLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground/70">
        {selected.length} / {max} selected
      </p>
    </div>
  );
}

function PreferencesCard() {
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();
  const { toast } = useToast();
  const mutateRef = useRef(update.mutateAsync);
  useEffect(() => {
    mutateRef.current = update.mutateAsync;
  }, [update.mutateAsync]);

  // Multi-select: the wire format is an array. Empty array means "fall back
  // to the singular `defaultVisualStyle`" (handy for users who want a single
  // canonical look). Selecting at least one style activates the pool.
  const [styles, setStyles] = useState<VisualStyle[]>([]);
  const [primaryStyle, setPrimaryStyle] = useState<VisualStyle>(
    "fantasy-illustration",
  );
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>("no-spoilers");
  const [readingMode, setReadingMode] =
    useState<"reading" | "listening" | "both">("reading");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const savedHideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!remote.data || dirty) return;
    setPrimaryStyle(remote.data.defaultVisualStyle);
    setStyles(remote.data.defaultVisualStyles);
    setSpoilerMode(remote.data.spoilerMode);
    setReadingMode(remote.data.readingMode);
  }, [remote.data, dirty]);

  useEffect(() => {
    if (!dirty) return;
    setStatus("saving");
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        await mutateRef.current({
          defaultVisualStyle: primaryStyle,
          defaultVisualStyles: styles,
          spoilerMode,
          readingMode,
        });
        if (cancelled) return;
        setDirty(false);
        setStatus("saved");
        if (savedHideTimer.current) window.clearTimeout(savedHideTimer.current);
        savedHideTimer.current = window.setTimeout(
          () => setStatus("idle"),
          1800,
        );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        toast({
          title: "Couldn't save preferences",
          description:
            err instanceof Error ? err.message : "Something went wrong.",
          variant: "destructive",
        });
      }
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [dirty, primaryStyle, styles, spoilerMode, readingMode, toast]);

  useEffect(
    () => () => {
      if (savedHideTimer.current) window.clearTimeout(savedHideTimer.current);
    },
    [],
  );

  // Toggle a style on/off in the multi-select pool. If the user is removing
  // the primary, we promote whichever remaining style is first; if the pool
  // becomes empty, the singular `primaryStyle` keeps doing its job.
  const toggleStyle = (s: VisualStyle) => {
    setDirty(true);
    setStyles((prev) => {
      const has = prev.includes(s);
      const next = has ? prev.filter((x) => x !== s) : [...prev, s];
      // If they're toggling the primary off and there's a remaining style,
      // promote the first remaining one so the "primary" badge stays sane.
      if (has && s === primaryStyle && next.length > 0) {
        setPrimaryStyle(next[0]);
      }
      // If the pool was empty and they just added one, also promote it as
      // the primary so the next book picks it up.
      if (!has && prev.length === 0) {
        setPrimaryStyle(s);
      }
      return next;
    });
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
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold">
              Reading preferences
            </h2>
            <p className="text-sm text-muted-foreground">
              Defaults applied to every new book. Changes save automatically.
            </p>
          </div>
          <div className="pt-1">
            <SaveStatus state={status} />
          </div>
        </div>

        {/* Visual style — multi-select */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
              Default visual styles
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Pick one or more. New scenes will rotate through your selection.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(VISUAL_STYLE_LABELS) as VisualStyle[]).map((s) => {
              const active = styles.includes(s);
              const isPrimary = active && s === primaryStyle;
              const colors = STYLE_PREVIEWS[s];
              return (
                <div
                  key={s}
                  className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                    active
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleStyle(s)}
                    aria-pressed={active}
                    className="block w-full text-left"
                  >
                    <div
                      className="h-16 w-full"
                      style={{
                        background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
                      }}
                    />
                    <div className="px-3 py-2 bg-black/40 flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">
                        {VISUAL_STYLE_LABELS[s]}
                      </span>
                      {isPrimary && (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--jtb-accent-hi)]/90 font-semibold shrink-0 inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[var(--jtb-accent-hi)]" />
                          Primary
                        </span>
                      )}
                    </div>
                  </button>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center pointer-events-none">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  {/* "Make primary" appears only on selected, non-primary
                       tiles. Stopping propagation isn't needed since this
                       lives outside the toggle button entirely — kept as
                       a sibling so a click can't accidentally toggle the
                       style off. */}
                  {active && !isPrimary && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryStyle(s);
                        setDirty(true);
                      }}
                      className="absolute top-1.5 left-1.5 px-1.5 h-5 rounded-full bg-black/70 hover:bg-primary hover:text-primary-foreground text-[var(--jtb-accent-hi)] text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 transition-colors"
                      aria-label={`Make ${VISUAL_STYLE_LABELS[s]} my primary style`}
                    >
                      <Star className="w-3 h-3" />
                      Make primary
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {styles.length > 1 && (
            <p className="text-[11px] text-muted-foreground/70">
              Tap "Make primary" on a selected style to use it as your default.
            </p>
          )}
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
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        active
                          ? "border-primary bg-primary"
                          : "border-border"
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
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="font-medium text-sm">{label}</div>
                </button>
              );
            })}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

/**
 * Reading-profile card. Genres, platforms, pace and a free-text "about my
 * reading life". Same debounced auto-save pattern as PreferencesCard, but
 * scoped to its own state so saves to one card don't push state from the
 * other.
 */
function ReadingProfileCard() {
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();
  const { toast } = useToast();
  const mutateRef = useRef(update.mutateAsync);
  useEffect(() => {
    mutateRef.current = update.mutateAsync;
  }, [update.mutateAsync]);

  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [pace, setPace] = useState<ReadingPace | null>(null);
  const [aboutMe, setAboutMe] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const savedHideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!remote.data || dirty) return;
    setGenres(remote.data.favoriteGenres);
    setPlatforms(remote.data.readingPlatforms);
    setPace(remote.data.readingPace);
    setAboutMe(remote.data.aboutMe);
  }, [remote.data, dirty]);

  useEffect(() => {
    if (!dirty) return;
    setStatus("saving");
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        await mutateRef.current({
          favoriteGenres: genres,
          readingPlatforms: platforms,
          readingPace: pace,
          aboutMe,
        });
        if (cancelled) return;
        setDirty(false);
        setStatus("saved");
        if (savedHideTimer.current) window.clearTimeout(savedHideTimer.current);
        savedHideTimer.current = window.setTimeout(
          () => setStatus("idle"),
          1800,
        );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        toast({
          title: "Couldn't save reading profile",
          description:
            err instanceof Error ? err.message : "Something went wrong.",
          variant: "destructive",
        });
      }
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [dirty, genres, platforms, pace, aboutMe, toast]);

  useEffect(
    () => () => {
      if (savedHideTimer.current) window.clearTimeout(savedHideTimer.current);
    },
    [],
  );

  if (remote.isLoading) return null;

  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-6 space-y-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold">
              Reading profile
            </h2>
            <p className="text-sm text-muted-foreground">
              Tell us what you love. We'll use this to suggest books, scene
              moods, and recommendations.
            </p>
          </div>
          <div className="pt-1">
            <SaveStatus state={status} />
          </div>
        </div>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            Favourite genres
          </p>
          <ChipMultiSelect
            preset={GENRE_TAGS}
            selected={genres}
            onChange={(next) => {
              setGenres(next);
              setDirty(true);
            }}
            max={MAX_GENRES}
            placeholder="Add a genre (e.g. Cozy Mystery)"
            customLabel="Add genre"
          />
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            Where you read &amp; listen
          </p>
          <ChipMultiSelect
            preset={PLATFORM_TAGS}
            selected={platforms}
            onChange={(next) => {
              setPlatforms(next);
              setDirty(true);
            }}
            max={MAX_PLATFORMS}
            placeholder="Add a platform (e.g. Storytel)"
            customLabel="Add platform"
          />
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
            Reading pace
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {READING_PACES.map((p) => {
              const active = pace === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPace(active ? null : p);
                    setDirty(true);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className="font-medium text-sm">
                    {READING_PACE_LABELS[p]}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
              About my reading life
            </p>
            <span className="text-[11px] text-muted-foreground/60">
              {aboutMe.length} / {MAX_ABOUT_ME}
            </span>
          </div>
          <Textarea
            value={aboutMe}
            onChange={(e) => {
              setAboutMe(e.target.value.slice(0, MAX_ABOUT_ME));
              setDirty(true);
            }}
            placeholder="A character or world that hooked you, what you're in the mood for, the kinds of endings you love…"
            rows={4}
            maxLength={MAX_ABOUT_ME}
            className="bg-card/30 border-border/40 resize-none"
          />
        </section>
      </CardContent>
    </Card>
  );
}

/**
 * Per-user opt-in toggle for sharing locally generated scene images with
 * the public Discover/trending feed. Defaults OFF — toggling fires a PATCH
 * to /me with the new value. We invalidate the trending feed on flip so
 * the user immediately sees their contribution appear (or disappear) on
 * Discover. Optimistic local state keeps the switch responsive while the
 * mutation is in flight; on error we revert and toast.
 */
function PrivacyCard() {
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const serverValue = remote.data?.shareToTrending ?? false;
  const [localValue, setLocalValue] = useState<boolean | null>(null);
  const value = localValue ?? serverValue;
  const [busy, setBusy] = useState(false);

  const handleChange = async (next: boolean) => {
    setLocalValue(next);
    setBusy(true);
    try {
      const updated = await update.mutateAsync({ shareToTrending: next });
      qc.setQueryData(["me"], updated);
      qc.invalidateQueries({ queryKey: ["trending"] });
    } catch (err) {
      // Reconcile from the server rather than freezing a stale local
      // override — another tab or the previous successful PATCH may
      // hold the truth. Drop our local guess and force a refetch so
      // the switch always reflects the canonical /me state next paint.
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({
        title: "Couldn't update sharing setting",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLocalValue(null);
      setBusy(false);
    }
  };

  if (remote.isLoading) return null;

  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold">
            Discover &amp; sharing
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose whether the scenes you generate help bring books to life
            for other readers.
          </p>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-black/20 p-4">
          <div className="space-y-1 min-w-0">
            <p className="font-medium text-sm">
              Share my scenes on Discover
            </p>
            <p className="text-xs text-muted-foreground">
              When on, the images you generate become eligible to appear as
              sample art on trending books in Discover. Off by default —
              your generations stay private to you until you turn this on.
            </p>
          </div>
          <Switch
            checked={value}
            disabled={busy}
            onCheckedChange={handleChange}
            aria-label="Share my generated scenes on Discover"
            className="mt-0.5 shrink-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Destructive actions live in their own card below preferences so they're
 * intentionally hard to find and impossible to trigger accidentally — every
 * action is gated behind an AlertDialog that requires explicit confirmation.
 */
function DangerZone() {
  const { userLibrary, clearLibrary } = useLibrary();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const count = userLibrary.length;

  const handleClear = async () => {
    setBusy(true);
    try {
      const removed = await clearLibrary();
      toast({
        title: "Library cleared",
        description:
          removed > 0
            ? `Removed ${removed} book${removed === 1 ? "" : "s"} and all their scenes.`
            : "Your library was already empty.",
      });
    } catch (err) {
      toast({
        title: "Couldn't clear library",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-red-950/10 border-red-500/20">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold text-red-200/90">
            Danger zone
          </h2>
          <p className="text-sm text-muted-foreground">
            These actions can't be undone. Take care.
          </p>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-black/20 p-4">
          <div className="space-y-1">
            <p className="font-medium text-sm">Reset my library</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete every book ({count}) and all generated scenes.
              Your account stays.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={busy || count === 0}
                className="border-red-500/40 text-red-200 hover:bg-red-500/10 hover:text-red-100 shrink-0"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1.5" />
                )}
                Clear library
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete every book in your library?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {count} book{count === 1 ? "" : "s"} along with
                  every chapter scene you've generated. You'll be able to add
                  books again, but the visualizations will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my library</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountInner() {
  const { user } = useUser();
  const remote = useRemoteUser();
  const update = useUpdateRemoteUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const greeting = user?.firstName ?? user?.username ?? "Reader";
  const initial = (greeting?.[0] ?? "R").toUpperCase();
  const email = user?.primaryEmailAddress?.emailAddress;

  const bunny = avatarUrl(remote.data?.avatarId ?? null);
  const clerkPhoto = user?.hasImage ? user.imageUrl : null;
  const headerAvatar = bunny ?? clerkPhoto;

  // Avatar selection is a single deliberate click; we want the header to
  // swap *now* rather than waiting on the invalidation refetch. We write
  // the response straight into the cache before the refetch lands so the
  // bunny appears in both the picker and the header without a flicker.
  const handleAvatarChange = async (id: AvatarId | null) => {
    try {
      const next = await update.mutateAsync({ avatarId: id });
      qc.setQueryData(["me"], next);
    } catch (err) {
      toast({
        title: "Couldn't update avatar",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 md:py-12 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 md:gap-5"
      >
        {headerAvatar ? (
          <img
            src={headerAvatar}
            alt={greeting}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border border-primary/30 ring-2 ring-primary/10 shrink-0 bg-black/30"
          />
        ) : (
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/15 text-[var(--jtb-accent-hi)] flex items-center justify-center font-serif text-2xl md:text-3xl border border-primary/30 shrink-0">
            {initial}
          </div>
        )}
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/80">
            Account
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight truncate">
            Hi, {greeting}
          </h1>
          {email && (
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          )}
        </div>
      </motion.div>

      <AvatarPickerCard
        selected={(remote.data?.avatarId ?? null) as AvatarId | null}
        onSelect={handleAvatarChange}
      />

      <PreferencesCard />

      <ReadingProfileCard />

      <PrivacyCard />

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

      <DangerZone />
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
