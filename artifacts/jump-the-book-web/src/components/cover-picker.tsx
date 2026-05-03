import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  searchOpenLibrary,
  type OpenLibrarySearchResult,
} from "@/lib/openLibrary";

interface Props {
  title: string;
  author: string;
  selectedCoverUrl: string | null;
  onSelect: (match: OpenLibrarySearchResult | null) => void;
}

/**
 * Inline cover picker for Smart Setup. Looks up the title+author on Open
 * Library and shows the top matches as cover thumbnails. Clicking a thumb
 * sets it as the chosen cover and (optionally) updates the series/year hints.
 *
 * "None of these" lets the user proceed with a generated branded cover.
 */
export default function CoverPicker({
  title,
  author,
  selectedCoverUrl,
  onSelect,
}: Props) {
  const [results, setResults] = useState<OpenLibrarySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const runSearch = async () => {
    if (!title.trim() || !author.trim()) {
      toast({
        title: "Add a title and author first",
        description: "We need both to search Open Library for a cover.",
      });
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    // Clear previous results so a slow response from a stale query can't flash
    // back into view while a newer search is in flight.
    setResults([]);
    try {
      const matches = await searchOpenLibrary(
        `${title} ${author}`,
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      const withCovers = matches.filter((m) => m.coverUrl).slice(0, 8);
      setResults(withCovers);
      if (withCovers.length === 0) {
        setError("No covers found. We'll use a stylized fallback.");
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError("Couldn't reach Open Library.");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  // auto-run once on mount when both inputs are present
  useEffect(() => {
    if (title.trim() && author.trim() && results.length === 0 && !loading) {
      void runSearch();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Pick the right cover</p>
          <p className="text-xs text-muted-foreground">
            Tap the edition that matches your book.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={runSearch}
          disabled={loading || !title.trim() || !author.trim()}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {results.map((r) => {
            const isSelected = selectedCoverUrl === r.coverUrlLarge;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => onSelect(r)}
                className={`group relative aspect-[2/3] rounded-md overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-transparent hover:border-primary/50"
                }`}
                title={`${r.title}${r.firstPublishYear ? ` (${r.firstPublishYear})` : ""}`}
              >
                {r.coverUrl ? (
                  <img
                    src={r.coverUrl}
                    alt={r.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="rounded-full bg-primary p-1">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
                {r.firstPublishYear && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-white text-center py-0.5">
                    {r.firstPublishYear}
                  </div>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`aspect-[2/3] rounded-md border-2 flex flex-col items-center justify-center text-[10px] gap-1 transition-all ${
              selectedCoverUrl === null
                ? "border-primary bg-primary/10 text-[var(--jtb-accent-hi)]"
                : "border-dashed border-border/60 text-muted-foreground hover:border-border"
            }`}
            title="Use a stylized fallback"
          >
            <BookOpen className="w-4 h-4" />
            <span className="leading-tight px-1">None of these</span>
          </button>
        </div>
      ) : loading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
          Searching Open Library…
        </div>
      ) : (
        <div className="text-xs text-muted-foreground py-4 text-center">
          {error ?? "Add a title and author, then we'll fetch covers."}
        </div>
      )}
    </div>
  );
}
