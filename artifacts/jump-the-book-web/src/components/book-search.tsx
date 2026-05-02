import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { searchOpenLibrary, type OpenLibrarySearchResult } from "@/lib/openLibrary";
import { useLibrary } from "@/lib/library";

const GRADIENTS: string[][] = [
  ["#1a1525", "#2d2440", "#453560"],
  ["#1a2a35", "#1f3a4a", "#2c5364"],
  ["#2a1820", "#4a2030", "#6b2848"],
  ["#1f2a1a", "#2c402a", "#3f5a3a"],
  ["#28203a", "#3a2c5a", "#4d3a7a"],
];

function pickGradient(seed: string): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function BookSearch() {
  const [, setLocation] = useLocation();
  const { addBook, settings } = useLibrary();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenLibrarySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const r = await searchOpenLibrary(query, controller.signal);
        if (!controller.signal.aborted) {
          setResults(r);
          setSearching(false);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearching(false);
        toast({
          title: "Search failed",
          description: "Couldn't reach Open Library. Try again in a moment.",
          variant: "destructive",
        });
      }
    }, 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, toast]);

  const handleAdd = async (r: OpenLibrarySearchResult) => {
    setSavingKey(r.key);
    try {
      const newId = await addBook({
        title: r.title,
        author: r.author,
        format: "Paperback",
        currentChapter: 1,
        currentPage: 0,
        currentAudioTimestamp: "00:00:00",
        spoilerMode: settings.spoilerMode,
        userNote: "",
        visualStyle: settings.defaultVisualStyle,
        progress: 0,
        coverGradient: pickGradient(r.key),
        heroImage: r.coverUrl ?? undefined,
      });
      toast({
        title: "Added to library",
        description: `${r.title} is now on your shelf.`,
      });
      setLocation(`/book/${newId}`);
    } catch (err) {
      setSavingKey(null);
      toast({
        title: "Couldn't add book",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="book-search" className="text-sm font-medium">
          Search by title or author
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="book-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. A Court of Thorns and Roses"
            className="pl-9"
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Powered by Open Library — millions of books, free and public. No file needed; we'll
          generate scenes from the chapter you're on.
        </p>
      </div>

      {query.trim().length >= 3 && results.length === 0 && !searching && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No matches. Try the author's name or a different spelling.
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((r) => {
            const isSaving = savingKey === r.key;
            return (
              <div
                key={r.key}
                className="flex gap-3 rounded-xl border border-border/40 bg-card/40 p-3 hover:border-primary/40 transition-colors"
              >
                <div
                  className="w-16 h-24 flex-shrink-0 rounded-md overflow-hidden bg-muted"
                  style={{
                    background: `linear-gradient(135deg, ${pickGradient(r.key).join(", ")})`,
                  }}
                >
                  {r.coverUrl ? (
                    <img
                      src={r.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h4 className="font-serif font-semibold leading-tight line-clamp-2 text-sm">
                    {r.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {r.author}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {[r.firstPublishYear, r.pageCount ? `${r.pageCount} pages` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-auto pt-2">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAdd(r)}
                      disabled={isSaving || savingKey !== null}
                      className="w-full"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Add to library"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
