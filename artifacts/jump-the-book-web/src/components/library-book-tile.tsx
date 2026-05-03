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
// Structural shape — accepts both real user-library items and the curated
// demo Book entries shown in the Classics grid. Both expose the same set of
// fields the tile actually reads (title, author, id, coverGradient, …); the
// tile doesn't depend on the user-only metadata (createdAt, remoteId, etc.).
export interface LibraryBookTileBook {
  id: string;
  title: string;
  author: string;
  coverGradient: string[];
  heroImage?: string;
  // Server-persisted cover URL (Open Library / CDN). When set we render this
  // directly and skip the Open Library lookup entirely.
  coverUrl?: string | null;
  currentChapter: number;
  progress?: number;
  tagline?: string;
}

interface Props {
  book: LibraryBookTileBook;
  index: number;
  hasBible?: boolean;
}

export default function LibraryBookTile({ book, index, hasBible = false }: Props) {
  const finished = (book.progress ?? 0) >= 100;
  const progress = Math.max(0, Math.min(100, book.progress ?? 0));
  const localCover = book.heroImage;
  const hasLocalCover = !!localCover;
  const persistedCover = book.coverUrl ?? null;
  const { toast } = useToast();

  // Only call Open Library when we have neither a built-in (heroImage) nor a
  // server-persisted (coverUrl) cover. Once the server has resolved a cover
  // for this book row, every subsequent render is a zero-network paint.
  const needsOl = !hasLocalCover && !persistedCover;
  const enrichment = useOpenLibraryEnrichment(book.title, book.author, {
    enabled: needsOl,
  });
  const webCover = needsOl ? enrichment.coverUrl : null;

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
            {!hasLocalCover && persistedCover && (
              <img
                src={persistedCover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            {needsOl && webCover && (
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
                className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2 py-0.5 shadow-sm"
                title="Smart story profile attached"
              >
                <Wand2 className="w-3 h-3" /> Bible
              </div>
            )}
            {needsOl && (
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
