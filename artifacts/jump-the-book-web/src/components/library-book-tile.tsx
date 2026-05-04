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
import type { ReadingStatus } from "@/hooks/useApiLibrary";
import ReadingStatusBadge from "@/components/reading-status-badge";

export interface LibraryBookTileBook {
  id: string;
  title: string;
  author: string;
  coverGradient: string[];
  heroImage?: string;
  coverUrl?: string | null;
  currentChapter: number;
  progress?: number;
  tagline?: string;
  readingStatus?: ReadingStatus;
  remoteId?: string;
  sceneCount?: number;
  seriesOrder?: number | null;
}

interface Props {
  book: LibraryBookTileBook;
  index: number;
  hasBible?: boolean;
  showStatusBadge?: boolean;
}

export default function LibraryBookTile({ book, index, hasBible = false, showStatusBadge = false }: Props) {
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
      // Cap the staggered entrance so a long bookshelf doesn't take
      // multiple seconds to fully animate in on mobile. The first 8
      // tiles get the cascade; everything after pops in instantly.
      transition={{ delay: Math.min(index, 8) * 0.04 }}
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
            {showStatusBadge && book.readingStatus && book.remoteId && (
              <div className="absolute top-2 left-2 z-10">
                <ReadingStatusBadge
                  bookId={book.remoteId}
                  currentStatus={book.readingStatus}
                  compact
                />
              </div>
            )}
            {finished && !showStatusBadge && (
              <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium px-2 py-0.5">
                <Check className="w-3 h-3" /> Finished
              </div>
            )}
            {book.seriesOrder != null && (
              <div
                className="absolute bottom-2 left-2 inline-flex items-center justify-center rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 shadow-sm backdrop-blur-sm"
                title={`Book #${book.seriesOrder} in series`}
              >
                #{book.seriesOrder}
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
              // Visibility is gated by INPUT CAPABILITY, not viewport
              // width. A touch tablet wider than `sm` still has no
              // hover, so a width-based reveal would re-hide this
              // button on those devices. Default state is visible at
              // partial opacity; on devices that genuinely have a
              // mouse-style hover (`@media (hover: hover)`) we revert
              // to the original "fade in on group hover" affordance.
              // `focus-visible` keeps the button discoverable for
              // keyboard users on every device.
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh cover from Open Library"
                aria-label="Refresh cover"
                className="absolute bottom-2 right-2 inline-flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white w-8 h-8 sm:w-7 sm:h-7 opacity-70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition-opacity"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Mobile: tighter padding + slightly smaller title so the
              2-col grid stays scannable; desktop sizing preserved. */}
          <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
            <h3 className="font-serif font-bold line-clamp-1 text-sm sm:text-base">
              {book.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
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
            {book.sceneCount != null && book.sceneCount > 0 && (
              <p className="text-[10px] text-muted-foreground/60">
                {book.sceneCount} scene{book.sceneCount !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
