import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Sparkles, BookOpen, Search, ChevronDown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useClaimOrphanScenes,
  usePatchRemoteBook,
  type RemoteBook,
} from "@/hooks/useApiLibrary";
import { searchOpenLibrary, type OpenLibrarySearchResult } from "@/lib/openLibrary";

const COVER_GRADIENTS: string[][] = [
  ["#1a1525", "#2d2440", "#453560"],
  ["#1a2a35", "#1f3a4a", "#2c5364"],
  ["#2a1820", "#4a2030", "#6b2848"],
  ["#1f2a1a", "#2c402a", "#3f5a3a"],
  ["#28203a", "#3a2c5a", "#4d3a7a"],
];

function pickCoverGradient(seed: string): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

type Mode =
  | { kind: "edit"; book: RemoteBook }
  | {
      kind: "claim-orphan";
      orphanUserBookId: string;
      sceneCount: number;
    };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved?: (book: RemoteBook) => void;
}

export default function EditBookDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const patch = usePatchRemoteBook();
  const claim = useClaimOrphanScenes();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [totalChapters, setTotalChapters] = useState("");

  // Claim-orphan specific state
  const [authorQuery, setAuthorQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpenLibrarySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<OpenLibrarySearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const modeKey =
    mode.kind === "edit" ? `edit:${mode.book.id}` : `claim:${mode.orphanUserBookId}`;
  useEffect(() => {
    if (!open) return;
    if (mode.kind === "edit") {
      setTitle(mode.book.title);
      setAuthor(mode.book.author);
      setTagline(mode.book.tagline ?? "");
      setHeroImage(mode.book.heroImage ?? "");
      setTotalChapters(
        mode.book.totalChapters != null ? String(mode.book.totalChapters) : "",
      );
    } else {
      setTitle("");
      setAuthor("");
      setTagline("");
      setHeroImage("");
      setTotalChapters("");
      setAuthorQuery("");
      setSearchResults([]);
      setSelectedResult(null);
      setManualMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modeKey]);

  // OpenLibrary author search for claim-orphan mode
  useEffect(() => {
    if (mode.kind !== "claim-orphan" || manualMode) return;
    const q = authorQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const r = await searchOpenLibrary(`author:${q}`, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(r);
          setSearching(false);
        }
      } catch {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [authorQuery, mode.kind, manualMode]);

  const isClaim = mode.kind === "claim-orphan";
  const pending = patch.isPending || claim.isPending;

  // For claim mode: either a result is selected or manual mode with title+author filled
  const canSave = isClaim
    ? selectedResult !== null || (manualMode && title.trim().length > 0 && author.trim().length > 0)
    : title.trim().length > 0 && author.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || pending) return;
    try {
      if (mode.kind === "edit") {
        const trimmedTotal = totalChapters.trim();
        const totalChaptersValue =
          trimmedTotal === "" ? null : Number.parseInt(trimmedTotal, 10);
        if (
          totalChaptersValue !== null &&
          (!Number.isFinite(totalChaptersValue) || totalChaptersValue < 0)
        ) {
          toast({
            title: "Invalid chapter count",
            description: "Total chapters must be a positive whole number.",
            variant: "destructive",
          });
          return;
        }
        const body: Record<string, unknown> = {
          title: title.trim(),
          author: author.trim(),
          tagline: tagline.trim() || null,
          heroImage: heroImage.trim() || null,
        };
        if (totalChaptersValue !== null) body.totalChapters = totalChaptersValue;
        const updated = await patch.mutateAsync({
          id: mode.book.id,
          ...body,
        });
        toast({
          title: "Book updated",
          description: `"${updated.title}" saved.`,
        });
        onSaved?.(updated);
      } else {
        const claimTitle = selectedResult ? selectedResult.title : title.trim();
        const claimAuthor = selectedResult ? selectedResult.author : author.trim();
        const claimHeroImage = selectedResult
          ? (selectedResult.coverUrlLarge ?? selectedResult.coverUrl ?? null)
          : null;
        const result = await claim.mutateAsync({
          userBookId: mode.orphanUserBookId,
          title: claimTitle,
          author: claimAuthor,
          heroImage: claimHeroImage,
        });
        toast({
          title: "Book recovered",
          description: `${result.movedSceneCount} ${result.movedSceneCount === 1 ? "scene" : "scenes"} moved into "${result.book.title}".`,
        });
        onSaved?.(result.book);
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            {isClaim ? (
              <>
                <Sparkles className="w-4 h-4 text-[var(--jtb-accent-hi)]" />
                Recover this book
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 text-[var(--jtb-accent-hi)]" />
                Edit book details
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isClaim
              ? `These ${mode.kind === "claim-orphan" ? mode.sceneCount : ""} scenes lost their book. Search by author to find it, or enter the title manually.`
              : "Fix the title, author, or cover when something looks off."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {isClaim && !manualMode ? (
            <ClaimSearchPanel
              authorQuery={authorQuery}
              setAuthorQuery={setAuthorQuery}
              searching={searching}
              results={searchResults}
              selected={selectedResult}
              onSelect={(r) => {
                setSelectedResult(r);
                setSearchResults([]);
              }}
              onClearSelection={() => setSelectedResult(null)}
              onManual={() => { setManualMode(true); setSelectedResult(null); }}
            />
          ) : isClaim && manualMode ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="claim-title">Title</Label>
                <Input
                  id="claim-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Name of the Wind"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-author">Author</Label>
                <Input
                  id="claim-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Patrick Rothfuss"
                  required
                />
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-[var(--jtb-accent-hi)] underline underline-offset-2"
                onClick={() => setManualMode(false)}
              >
                ← Back to search
              </button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit-book-title">Title</Label>
                <Input
                  id="edit-book-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Name of the Wind"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-book-author">Author</Label>
                <Input
                  id="edit-book-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Patrick Rothfuss"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-book-tagline">
                  Tagline{" "}
                  <span className="text-muted-foreground/70 text-xs">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="edit-book-tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="A short one-liner shown on the book page."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-book-chapters">
                    Total chapters{" "}
                    <span className="text-muted-foreground/70 text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="edit-book-chapters"
                    type="number"
                    min={0}
                    value={totalChapters}
                    onChange={(e) => setTotalChapters(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-book-cover">
                    Cover URL{" "}
                    <span className="text-muted-foreground/70 text-xs">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="edit-book-cover"
                    type="url"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSave || pending}
              className="bg-primary text-black hover:bg-[var(--jtb-accent-hi)]"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : isClaim ? (
                "Recover book"
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ClaimSearchPanelProps {
  authorQuery: string;
  setAuthorQuery: (v: string) => void;
  searching: boolean;
  results: OpenLibrarySearchResult[];
  selected: OpenLibrarySearchResult | null;
  onSelect: (r: OpenLibrarySearchResult) => void;
  onClearSelection: () => void;
  onManual: () => void;
}

function ClaimSearchPanel({
  authorQuery,
  setAuthorQuery,
  searching,
  results,
  selected,
  onSelect,
  onClearSelection,
  onManual,
}: ClaimSearchPanelProps) {
  return (
    <div className="space-y-3">
      {selected ? (
        <div className="flex gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <div
            className="w-20 h-28 flex-shrink-0 rounded-md overflow-hidden bg-muted"
            style={{
              background: `linear-gradient(135deg, ${pickCoverGradient(selected.key).join(", ")})`,
            }}
          >
            {selected.coverUrlLarge || selected.coverUrl ? (
              <img
                src={selected.coverUrlLarge ?? selected.coverUrl ?? ""}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif font-semibold text-sm leading-tight line-clamp-2">{selected.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{selected.author}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {[selected.firstPublishYear, selected.pageCount ? `${selected.pageCount} pages` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-muted-foreground hover:text-destructive shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="claim-author-search">Author name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="claim-author-search"
                value={authorQuery}
                onChange={(e) => setAuthorQuery(e.target.value)}
                placeholder="e.g. Patrick Rothfuss"
                className="pl-9"
                autoFocus
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Type the author's name to find matching books from Open Library.
            </p>
          </div>

          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
              {results.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onSelect(r)}
                  className="w-full flex gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <div
                    className="w-16 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                    style={{
                      background: `linear-gradient(135deg, ${pickCoverGradient(r.key).join(", ")})`,
                    }}
                  >
                    {r.coverUrl ? (
                      <img
                        src={r.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold text-sm leading-tight line-clamp-2">
                      {r.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {r.author}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {[r.firstPublishYear, r.pageCount ? `${r.pageCount} pages` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {authorQuery.trim().length >= 3 && !searching && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No matches found.
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onManual}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--jtb-accent-hi)] transition-colors"
      >
        <ChevronDown className="w-3 h-3" />
        Can't find it? Enter title manually
      </button>
    </div>
  );
}
