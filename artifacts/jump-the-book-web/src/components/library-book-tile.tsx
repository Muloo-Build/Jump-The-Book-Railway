import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, RefreshCw, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useOpenLibraryEnrichment,
  clearEnrichmentCache,
} from "@/hooks/useOpenLibraryEnrichment";
import { useToast } from "@/hooks/use-toast";
import type { UserLibraryItem } from "@/data/books";

interface Props {
  book: UserLibraryItem;
  index: number;
  hasBible?: boolean;
}

export default function LibraryBookTile({ book, index, hasBible = false }: Props) {
  const finished = (book.progress ?? 0) >= 100;
  const progress = Math.max(0, Math.min(100, book.progress ?? 0));
  const localCover = book.heroImage;
  const hasLocalCover = !!localCover;
  const { toast } = useToast();

  // Only call Open Library when this book has no built-in cover.
  // Cached + shared with the book detail hero so it's a single network call.
  const enrichment = useOpenLibraryEnrichment(book.title, book.author, {
    enabled: !hasLocalCover,
  });
  const webCover = !hasLocalCover ? enrichment.coverUrl : null;

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearEnrichmentCache(book.title, book.author);
    toast({
      title: "Refreshing cover",
      description: "We'll re-check Open Library on next reload.",
    });
    // small delay so the toast renders before reload
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/book/${book.id}`}>
        <Card className="group overflow-hidden hover:ring-2 ring-primary/50 transition-all cursor-pointer h-full border-border/40 bg-card/50">
          <div
            className="aspect-[2/3] w-full relative"
            style={{
              background: `linear-gradient(to bottom right, ${book.coverGradient[0]}, ${book.coverGradient[1]})`,
            }}
          >
            {hasLocalCover &&
              localCover &&
              (localCover.startsWith("http") || localCover.startsWith("/")) && (
                <img
                  src={localCover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            {!hasLocalCover && webCover && (
              <img
                src={webCover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            {finished && (
              <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium px-2 py-0.5">
                <Check className="w-3 h-3" /> Finished
              </div>
            )}
            {hasBible && !finished && (
              <div
                className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-400/90 text-black text-[10px] font-semibold px-2 py-0.5 shadow-sm"
                title="Smart story profile attached"
              >
                <Wand2 className="w-3 h-3" /> Bible
              </div>
            )}
            {!hasLocalCover && (
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh cover from Open Library"
                aria-label="Refresh cover"
                className="absolute bottom-2 right-2 inline-flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-serif font-bold line-clamp-1">{book.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {book.author}
            </p>
            {progress > 0 && !finished && (
              <div className="space-y-1 pt-1">
                <Progress value={progress} className="h-1" />
                <p className="text-[10px] text-muted-foreground/80">
                  {progress}% · Ch {book.currentChapter}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
