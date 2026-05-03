import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLibrary } from "@/lib/library";
import {
  searchOpenLibrary,
  type OpenLibrarySearchResult,
} from "@/lib/openLibrary";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the vision model read off the cover. */
  guessedTitle: string;
  guessedAuthor: string;
  /** 0..1 self-reported confidence from the vision model. */
  confidence: number;
}

const RESULT_LIMIT = 3;

const FALLBACK_GRADIENT: string[] = ["#3a1a6e", "#9d7fe8"];

/**
 * After a cover snap, ask Open Library for the top matches of the
 * model-read (title, author) and let the user pick which one to add
 * to their library. The first match is preselected; an "edit search"
 * affordance lets the user override the title/author when the read
 * is off and re-query.
 */
export default function CoverPickerDialog({
  open,
  onOpenChange,
  guessedTitle,
  guessedAuthor,
  confidence,
}: Props) {
  const [, setLocation] = useLocation();
  const { addBook, settings } = useLibrary();
  const { toast } = useToast();

  // The user can revise the search if our cover read is wrong.
  const [editing, setEditing] = useState(false);
  const [titleQ, setTitleQ] = useState(guessedTitle);
  const [authorQ, setAuthorQ] = useState(guessedAuthor);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Reseed the local search whenever a new snap opens this dialog. We
  // depend only on stable identifiers (the guessed strings), never on
  // open/object-identity, so user edits are never wiped mid-flow.
  useEffect(() => {
    setTitleQ(guessedTitle);
    setAuthorQ(guessedAuthor);
    setSelectedKey(null);
    setEditing(false);
  }, [guessedTitle, guessedAuthor]);

  // Keep the active search query in sync with the (possibly edited)
  // title/author. We use the same `${title} ${author}` shape that
  // `searchOpenLibrary` already understands.
  const queryStr = `${titleQ.trim()} ${authorQ.trim()}`.trim();
  const search = useQuery({
    queryKey: ["openlib", "cover-picker", titleQ.trim(), authorQ.trim()],
    enabled: open && queryStr.length >= 3,
    queryFn: ({ signal }) => searchOpenLibrary(queryStr, signal),
    staleTime: 60_000,
  });

  const candidates = (search.data ?? []).slice(0, RESULT_LIMIT);

  // Auto-select the top match once results land so the user can hit
  // "Add to library" immediately. Only seeds when nothing's chosen yet
  // so the user's pick is never overwritten.
  useEffect(() => {
    if (!selectedKey && candidates.length > 0) {
      setSelectedKey(candidates[0]!.key);
    }
  }, [candidates, selectedKey]);

  const selected = candidates.find((c) => c.key === selectedKey);
  const lowConfidence = confidence > 0 && confidence < 0.55;

  const handleAdd = async (match: OpenLibrarySearchResult) => {
    if (adding) return;
    setAdding(true);
    try {
      const heroImage =
        match.coverUrlLarge ?? match.coverUrl ?? undefined;
      const newId = await addBook(
        {
          title: match.title,
          author: match.author,
          format: "Paperback",
          coverGradient: FALLBACK_GRADIENT,
          visualStyle: settings.defaultVisualStyle,
          spoilerMode: settings.spoilerMode,
          currentChapter: 1,
          currentPage: 0,
          currentAudioTimestamp: "00:00:00",
          progress: 0,
          userNote: "",
          ...(heroImage ? { heroImage } : {}),
        },
        { source: "manual" },
      );
      toast({
        title: "Added to library",
        description: `“${match.title}” is on your shelf.`,
      });
      onOpenChange(false);
      setLocation(`/book/${newId}`);
    } catch (err) {
      toast({
        title: "Couldn't add that book",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="w-4 h-4 text-[var(--jtb-accent-hi)]" />
            We think this is…
          </DialogTitle>
          <DialogDescription>
            {lowConfidence
              ? "The cover was hard to read. Pick the right edition or edit the search."
              : "Pick the edition you want on your shelf, or edit the search if we got it wrong."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What we read off the cover (collapses into an Edit button) */}
          {!editing ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2">
              <div className="min-w-0 text-sm">
                <span className="text-muted-foreground">Searching: </span>
                <span className="font-medium truncate">
                  {titleQ || "—"}{" "}
                  <span className="text-muted-foreground">by</span>{" "}
                  {authorQ || "—"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="shrink-0 text-[var(--jtb-accent-hi)] hover:text-[var(--jtb-accent-hi)]"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="cover-search-title">Title</Label>
                <Input
                  id="cover-search-title"
                  value={titleQ}
                  onChange={(e) => setTitleQ(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cover-search-author">Author</Label>
                <Input
                  id="cover-search-author"
                  value={authorQ}
                  onChange={(e) => setAuthorQ(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Search states */}
          {search.isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking up matches on Open Library…
            </div>
          )}

          {search.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-destructive">
                  Couldn't reach Open Library
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Try again, or hit Edit to revise the search.
                </p>
              </div>
            </div>
          )}

          {!search.isLoading &&
            !search.isError &&
            search.isFetched &&
            candidates.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-8 text-center">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm font-medium">No matches on Open Library</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  We couldn't find an exact match. Add the book using what
                  we read off the cover, or edit the search.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void handleAdd({
                        key: `read:${titleQ}:${authorQ}`,
                        workKey: "",
                        title: titleQ.trim(),
                        author: authorQ.trim(),
                        firstPublishYear: null,
                        pageCount: null,
                        coverUrl: null,
                        coverUrlLarge: null,
                      })
                    }
                    disabled={
                      adding || !titleQ.trim() || !authorQ.trim()
                    }
                    className="bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)]"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      <>Add “{titleQ.trim() || "—"}” as-is</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit search
                  </Button>
                </div>
              </div>
            )}

          {candidates.length > 0 && (
            <ul className="space-y-2">
              {candidates.map((c) => {
                const active = selectedKey === c.key;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(c.key)}
                      className={`w-full flex items-stretch gap-3 rounded-xl border text-left transition-all overflow-hidden ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border/50 hover:border-primary/40"
                      }`}
                    >
                      <div className="w-16 sm:w-20 shrink-0 bg-gradient-to-br from-purple-900/60 to-indigo-900/60 flex items-center justify-center">
                        {c.coverUrl ? (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <img
                            src={c.coverUrl}
                            className="w-full h-full object-cover"
                            alt=""
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <BookOpen className="w-6 h-6 text-white/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-2.5 pr-3 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-semibold truncate">
                            {c.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            by {c.author}
                            {c.firstPublishYear
                              ? ` · ${c.firstPublishYear}`
                              : ""}
                            {c.pageCount ? ` · ${c.pageCount}p` : ""}
                          </p>
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={adding}
            className="sm:mr-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected || adding || search.isLoading}
            onClick={() => selected && handleAdd(selected)}
            className="bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)]"
          >
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding…
              </>
            ) : (
              "Add to library"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
