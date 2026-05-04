import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, BookMarked, Loader2, X } from "lucide-react";
import type { SeriesInfo } from "@workspace/jump-the-book-shared/openLibrary";
import { useAddRemoteBook, type ReadingStatus } from "@/hooks/useApiLibrary";
import { useLibrary } from "@/lib/library";
import { useToast } from "@/hooks/use-toast";

interface Props {
  seriesInfo: SeriesInfo;
  currentBookTitle: string;
  onDismiss: () => void;
}

export default function SeriesPrompt({ seriesInfo, currentBookTitle, onDismiss }: Props) {
  const { settings } = useLibrary();
  const addBook = useAddRemoteBook();
  const { toast } = useToast();
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  const otherBooks = seriesInfo.books.filter(
    (b) => b.title.toLowerCase() !== currentBookTitle.toLowerCase(),
  );

  if (otherBooks.length === 0) return null;

  const handleAddBook = async (book: (typeof otherBooks)[number]) => {
    setAdding(book.workKey);
    try {
      await addBook.mutateAsync({
        title: book.title,
        author: book.author,
        source: "manual",
        visualStyle: settings.defaultVisualStyle,
        spoilerMode: settings.spoilerMode,
        coverUrl: book.coverUrlLarge ?? book.coverUrl ?? null,
        readingStatus: "want-to-read" as ReadingStatus,
        seriesName: seriesInfo.seriesName,
        seriesOrder: book.seriesOrder,
      });
      setAddedKeys((prev) => new Set([...prev, book.workKey]));
      toast({ title: `Added "${book.title}"`, description: "Marked as Want to Read" });
    } catch {
      toast({ title: "Couldn't add book", variant: "destructive" });
    } finally {
      setAdding(null);
    }
  };

  const handleAddAll = async () => {
    const toAdd = otherBooks.filter((b) => !addedKeys.has(b.workKey));
    for (const book of toAdd) {
      await handleAddBook(book);
    }
  };

  const allAdded = otherBooks.every((b) => addedKeys.has(b.workKey));

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-[var(--jtb-accent-hi)]" />
              Part of a series
            </h3>
            <p className="text-sm text-muted-foreground">
              This book belongs to <span className="font-medium text-foreground">{seriesInfo.seriesName}</span>.
              Add the rest to your shelf?
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {otherBooks.slice(0, 8).map((book) => {
            const isAdded = addedKeys.has(book.workKey);
            const isAdding = adding === book.workKey;
            return (
              <div
                key={book.workKey}
                className="rounded-lg border border-border/40 bg-card/30 overflow-hidden"
              >
                {book.coverUrl && (
                  <div className="aspect-[2/3] w-full bg-card/50">
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}
                <div className="p-2 space-y-1.5">
                  <p className="text-xs font-medium line-clamp-2">{book.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{book.author}</p>
                  <button
                    type="button"
                    onClick={() => handleAddBook(book)}
                    disabled={isAdded || isAdding}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-medium h-6 px-2 transition-colors border border-border/40 hover:bg-card disabled:opacity-60"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Added
                      </>
                    ) : isAdding ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Add to shelf"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          {!allAdded && otherBooks.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddAll}
              disabled={adding !== null}
            >
              {adding !== null ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <BookMarked className="w-3.5 h-3.5 mr-1.5" />
              )}
              Add all as "Want to Read"
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            {allAdded ? "Done" : "Skip"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
