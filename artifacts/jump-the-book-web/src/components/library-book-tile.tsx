import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOpenLibraryEnrichment } from "@/hooks/useOpenLibraryEnrichment";
import type { UserLibraryItem } from "@/data/books";

interface Props {
  book: UserLibraryItem;
  index: number;
}

export default function LibraryBookTile({ book, index }: Props) {
  const finished = (book.progress ?? 0) >= 100;
  const progress = Math.max(0, Math.min(100, book.progress ?? 0));
  const localCover = book.heroImage;
  const hasLocalCover = !!localCover;

  // Only call Open Library when this book has no built-in cover.
  // Cached + shared with the book detail hero so it's a single network call.
  const enrichment = useOpenLibraryEnrichment(book.title, book.author, {
    enabled: !hasLocalCover,
  });
  const webCover = !hasLocalCover ? enrichment.coverUrl : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/book/${book.id}`}>
        <Card className="overflow-hidden hover:ring-2 ring-primary/50 transition-all cursor-pointer h-full border-border/40 bg-card/50">
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
