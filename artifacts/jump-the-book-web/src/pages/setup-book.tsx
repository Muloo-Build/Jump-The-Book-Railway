import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import Layout from "@/components/layout";
import BibleEditor from "@/components/bible-editor";
import CoverPicker from "@/components/cover-picker";
import VoiceCaptureButton from "@/components/voice-capture-button";
import type { OpenLibrarySearchResult } from "@/lib/openLibrary";
import {
  EMPTY_DRAFT,
  useBookBible,
  useGenerateBibleDraft,
  useSaveBookBible,
  type BibleDraft,
} from "@/hooks/useBookBible";
import { useLibrary } from "@/lib/library";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";

const FORMATS = [
  "Paperback",
  "Hardcover",
  "EPUB",
  "Kindle",
  "Audible",
  "Other",
];

const STEPS = [
  { n: 1, title: "Identify the book" },
  { n: 2, title: "Build the bible" },
  { n: 3, title: "Review & confirm" },
  { n: 4, title: "Generate companion" },
];

interface BibleEditorValue {
  draft: BibleDraft;
  userNotes: string;
  focusAreas: string[];
  avoidNotes: string;
}

const DEFAULT_VALUE: BibleEditorValue = {
  draft: EMPTY_DRAFT,
  userNotes: "",
  focusAreas: [],
  avoidNotes: "",
};

export default function SetupBook() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const editingBookId = params.get("bookId");

  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const { addBook, settings } = useLibrary();
  const { toast } = useToast();

  // Wizard state
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [series, setSeries] = useState("");
  const [bookNumber, setBookNumber] = useState<string>("");
  const [format, setFormat] = useState("Paperback");
  const [chapter, setChapter] = useState("1");
  const [excerpt, setExcerpt] = useState("");
  const [whatJustHappened, setWhatJustHappened] = useState("");
  const [pickedCoverUrl, setPickedCoverUrl] = useState<string | null>(null);

  const [bibleValue, setBibleValue] = useState<BibleEditorValue>(DEFAULT_VALUE);

  // ── Edit-existing-bible mode ────────────────────────────────────────────
  const existingBibleQ = useBookBible(editingBookId);
  const [hydratedFromExisting, setHydratedFromExisting] = useState(false);
  useEffect(() => {
    if (!editingBookId || hydratedFromExisting) return;
    const b = existingBibleQ.data?.bible;
    if (!b) return;
    setBibleValue({
      draft: {
        series: b.series,
        bookNumber: b.bookNumber,
        genre: b.genre,
        tone: b.tone,
        settingSummary: b.settingSummary,
        visualStyleHints: b.visualStyleHints,
        nonSpoilerSummary: b.nonSpoilerSummary,
        publisherBlurb: b.publisherBlurb,
        factions: b.factions,
        locations: b.locations,
        species: b.species,
        ships: b.ships,
        technology: b.technology,
        importantObjects: b.importantObjects,
        characterProfiles: b.characterProfiles,
        sources: b.sources,
      },
      userNotes: b.userNotes,
      focusAreas: b.focusAreas,
      avoidNotes: b.avoidNotes,
    });
    setHydratedFromExisting(true);
    // Skip identify + search — go straight to review
    setStep(3);
  }, [editingBookId, existingBibleQ.data, hydratedFromExisting]);

  const generateDraft = useGenerateBibleDraft();
  const saveBible = useSaveBookBible();
  const [isSaving, setIsSaving] = useState(false);

  // ── Step handlers ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!title.trim() || !author.trim()) {
      toast({
        title: "Title and author are required",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
    try {
      const res = await generateDraft.mutateAsync({
        title: title.trim(),
        author: author.trim(),
        series: series.trim() || undefined,
        bookNumber: bookNumber ? Number(bookNumber) : null,
      });
      setBibleValue({
        draft: res.draft,
        userNotes: "",
        focusAreas: [],
        avoidNotes: "",
      });
      setStep(3);
    } catch (err) {
      toast({
        title: "Couldn't build a bible draft",
        description:
          err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
      setStep(1);
    }
  };

  const handleSkipSearch = () => {
    if (!title.trim() || !author.trim()) {
      toast({
        title: "Title and author are required",
        variant: "destructive",
      });
      return;
    }
    setBibleValue({
      draft: {
        ...EMPTY_DRAFT,
        series: series.trim() || null,
        bookNumber: bookNumber ? Number(bookNumber) : null,
      },
      userNotes: "",
      focusAreas: [],
      avoidNotes: "",
    });
    setStep(3);
  };

  const handleSaveAndContinue = async () => {
    if (!isSignedIn) {
      toast({
        title: "Sign in to save your book bible",
        description: "Your story profile is saved across devices.",
      });
      setLocation("/sign-in");
      return;
    }

    setIsSaving(true);
    try {
      let bookId = editingBookId;

      // Create the user_book if we're in new-book mode
      if (!bookId) {
        bookId = await addBook({
          title: title.trim(),
          author: author.trim(),
          format,
          currentChapter: parseInt(chapter, 10) || 1,
          currentPage: 0,
          currentAudioTimestamp: "00:00:00",
          spoilerMode: settings.spoilerMode,
          userNote: "",
          visualStyle: settings.defaultVisualStyle,
          progress: 0,
          coverGradient: ["#1a1525", "#2d2440", "#453560"],
          heroImage: pickedCoverUrl ?? undefined,
        });
      }

      await saveBible.mutateAsync({
        bookId,
        draft: bibleValue.draft,
        userNotes: bibleValue.userNotes,
        focusAreas: bibleValue.focusAreas,
        avoidNotes: bibleValue.avoidNotes,
      });

      toast({
        title: "Book bible saved",
        description: "Your story profile is ready.",
      });

      // If we have excerpt or whatJustHappened, hand off to /generate
      if (!editingBookId && (excerpt.trim() || whatJustHappened.trim())) {
        // Stash optional reading context for the generator
        try {
          sessionStorage.setItem(
            "@jtb_pending_reading_context",
            JSON.stringify({
              bookId,
              chapter: parseInt(chapter, 10) || 1,
              excerpt: excerpt.trim() || undefined,
              whatJustHappened: whatJustHappened.trim() || undefined,
              savedAt: Date.now(),
            }),
          );
        } catch {}
        setLocation(
          `/generate?bookId=${encodeURIComponent(bookId)}&chapter=${parseInt(chapter, 10) || 1}`,
        );
        return;
      }

      setLocation(`/book/${bookId}`);
    } catch (err) {
      toast({
        title: "Couldn't save your book bible",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Auth gate ───────────────────────────────────────────────────────────
  if (isLoaded && !isSignedIn) {
    return (
      <Layout>
        <div className="container max-w-xl mx-auto py-24 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-amber-300 mb-4" />
          <h1 className="font-serif text-3xl font-bold mb-3">
            Sign in to set up a book
          </h1>
          <p className="text-muted-foreground mb-8">
            Smart Setup saves your book bible so every scene is grounded in the
            same story context — across devices.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setLocation("/sign-up")}>Get started</Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/sign-in")}
            >
              Sign in
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container max-w-3xl mx-auto px-4 py-12 space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-amber-300 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Smart Book Setup
          </div>
          <h1 className="font-serif text-4xl font-bold">
            {editingBookId
              ? "Edit your book bible"
              : "Add the book you're reading"}
          </h1>
          <p className="text-muted-foreground">
            We'll build a visual companion grounded in your story's world,
            characters, and tone.
          </p>
        </header>

        <Stepper current={step} />

        {step === 1 && (
          <Step1
            title={title}
            setTitle={setTitle}
            author={author}
            setAuthor={setAuthor}
            series={series}
            setSeries={setSeries}
            bookNumber={bookNumber}
            setBookNumber={setBookNumber}
            format={format}
            setFormat={setFormat}
            chapter={chapter}
            setChapter={setChapter}
            excerpt={excerpt}
            setExcerpt={setExcerpt}
            whatJustHappened={whatJustHappened}
            setWhatJustHappened={setWhatJustHappened}
            pickedCoverUrl={pickedCoverUrl}
            onPickCover={(match) => {
              setPickedCoverUrl(match?.coverUrlLarge ?? null);
              if (match) {
                if (!series.trim() && match.title && match.title !== title) {
                  // leave alone — we don't override user-typed series
                }
              }
            }}
            onSearch={handleSearch}
            onSkip={handleSkipSearch}
            isSearching={generateDraft.isPending}
          />
        )}

        {step === 2 && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <h2 className="font-serif text-2xl font-semibold">
                Building your book bible
              </h2>
              <p className="text-muted-foreground">
                Searching for "{title}" by {author}
                {series && ` · ${series}`}
                {bookNumber && ` #${bookNumber}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Pulling together world, characters, locations, and tone from
                publicly available context. This usually takes 10–20 seconds.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Review your story profile
                </p>
                <p className="text-muted-foreground mt-1">
                  We may have missed details or made small mistakes — your edits
                  here directly shape every scene we generate.
                </p>
              </div>
            </div>

            <BibleEditor value={bibleValue} onChange={setBibleValue} />

            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-border/40">
              {editingBookId ? (
                <Button
                  variant="ghost"
                  onClick={() => setLocation(`/book/${editingBookId}`)}
                  disabled={isSaving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to book
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={isSaving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="min-w-[240px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : editingBookId ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Save bible
                  </>
                ) : excerpt.trim() || whatJustHappened.trim() ? (
                  <>
                    Save & generate visual story{" "}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" /> Save & open book
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs text-muted-foreground">
      {STEPS.map((s, i) => {
        const active = current === s.n;
        const done = current > s.n;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-semibold ${
                done
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : active
                    ? "bg-amber-400/20 text-amber-200 border border-amber-400/50"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : s.n}
            </span>
            <span
              className={
                active
                  ? "text-foreground font-medium"
                  : done
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
              }
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <span className="w-6 h-px bg-border/60 mx-1" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface Step1Props {
  title: string;
  setTitle: (v: string) => void;
  author: string;
  setAuthor: (v: string) => void;
  series: string;
  setSeries: (v: string) => void;
  bookNumber: string;
  setBookNumber: (v: string) => void;
  format: string;
  setFormat: (v: string) => void;
  chapter: string;
  setChapter: (v: string) => void;
  excerpt: string;
  setExcerpt: (v: string) => void;
  whatJustHappened: string;
  setWhatJustHappened: (v: string) => void;
  pickedCoverUrl: string | null;
  onPickCover: (match: OpenLibrarySearchResult | null) => void;
  onSearch: () => void;
  onSkip: () => void;
  isSearching: boolean;
}

function Step1(p: Step1Props) {
  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldLabel label="Book title" required>
            <Input
              value={p.title}
              onChange={(e) => p.setTitle(e.target.value)}
              placeholder="e.g. Zero Hour"
            />
          </FieldLabel>
          <FieldLabel label="Author" required>
            <Input
              value={p.author}
              onChange={(e) => p.setAuthor(e.target.value)}
              placeholder="e.g. Craig Alanson"
            />
          </FieldLabel>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldLabel label="Series (optional)">
            <Input
              value={p.series}
              onChange={(e) => p.setSeries(e.target.value)}
              placeholder="e.g. Expeditionary Force"
            />
          </FieldLabel>
          <FieldLabel label="Book number (optional)">
            <Input
              type="number"
              min={1}
              value={p.bookNumber}
              onChange={(e) => p.setBookNumber(e.target.value)}
              placeholder="e.g. 19"
            />
          </FieldLabel>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldLabel label="Format">
            <Select value={p.format} onValueChange={p.setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Current chapter">
            <Input
              type="number"
              min={1}
              value={p.chapter}
              onChange={(e) => p.setChapter(e.target.value)}
            />
          </FieldLabel>
        </div>

        <div className="space-y-3 pt-2 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Tell us where you are (optional — helps ground the visuals)
          </p>
          <FieldLabel label="What just happened?">
            <div className="relative">
              <Textarea
                value={p.whatJustHappened}
                onChange={(e) => p.setWhatJustHappened(e.target.value)}
                rows={2}
                placeholder="A line or two about your current scene… or tap the mic to dictate."
                className="pr-12"
              />
              <div className="absolute top-1.5 right-1.5">
                <VoiceCaptureButton
                  value={p.whatJustHappened}
                  onChange={p.setWhatJustHappened}
                />
              </div>
            </div>
          </FieldLabel>
          <FieldLabel label="Paste a short excerpt (optional)">
            <div className="relative">
              <Textarea
                value={p.excerpt}
                onChange={(e) => p.setExcerpt(e.target.value)}
                rows={4}
                placeholder="A passage from the chapter you're on… or dictate it."
                maxLength={6000}
                className="pr-12"
              />
              <div className="absolute top-1.5 right-1.5">
                <VoiceCaptureButton
                  value={p.excerpt}
                  onChange={p.setExcerpt}
                />
              </div>
            </div>
          </FieldLabel>
        </div>

        {p.title.trim() && p.author.trim() && (
          <CoverPicker
            title={p.title}
            author={p.author}
            selectedCoverUrl={p.pickedCoverUrl}
            onSelect={p.onPickCover}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            size="lg"
            onClick={p.onSearch}
            disabled={p.isSearching || !p.title.trim() || !p.author.trim()}
            className="flex-1"
          >
            {p.isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Search Book Context
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={p.onSkip}
            disabled={p.isSearching}
            className="flex-1"
          >
            Skip and set up manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-amber-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
