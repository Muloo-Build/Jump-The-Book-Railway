import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOpenLibraryEnrichment } from "@/hooks/useOpenLibraryEnrichment";
import type { UserLibraryItem } from "@/data/books";

interface Props {
  book: UserLibraryItem;
}

/**
 * Big "Now Reading" card pinned to the top of the library.
 * Shows the most-recently-active book with a one-tap path to generate
 * the next scene or jump back into the cinematic experience.
 */
export default function NowReadingHero({ book }: Props) {
  const localCover = book.heroImage;
  const hasLocalCover = !!localCover;
  const enrichment = useOpenLibraryEnrichment(book.title, book.author, {
    enabled: !hasLocalCover,
  });
  const cover =
    hasLocalCover && localCover
      ? localCover.startsWith("http") || localCover.startsWith("/")
        ? localCover
        : null
      : enrichment.coverUrl;

  const progress = Math.max(0, Math.min(100, book.progress ?? 0));
  const chapter = book.currentChapter ?? 1;
  const gradient = book.coverGradient ?? [];
  const gradFrom = gradient[0] ?? "#1a1525";
  const gradTo = gradient[1] ?? gradient[0] ?? "#453560";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-background"
    >
      {/* Ambient blur backdrop from the cover */}
      {cover && (
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>
      )}

      <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
        {/* Cover */}
        <Link
          href={`/book/${book.id}`}
          className="relative shrink-0 w-32 md:w-40 aspect-[2/3] rounded-lg overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/40"
          style={{
            background: `linear-gradient(to bottom right, ${gradFrom}, ${gradTo})`,
          }}
        >
          {cover && (
            <img
              src={cover}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-300/90 font-medium">
              <Sparkles className="w-3 h-3" />
              Now reading
            </div>
            <Link href={`/book/${book.id}`}>
              <h2 className="font-serif text-2xl md:text-3xl font-bold leading-tight hover:text-amber-200 transition-colors line-clamp-2">
                {book.title}
              </h2>
            </Link>
            <p className="text-sm text-muted-foreground">{book.author}</p>
          </div>

          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Chapter {chapter}</span>
              {progress > 0 && (
                <span className="text-muted-foreground">{progress}%</span>
              )}
            </div>
            {progress > 0 && <Progress value={progress} className="h-1.5" />}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/generate?bookId=${book.id}&chapter=${chapter}`}>
              <Button size="default" className="gap-2">
                <Wand2 className="w-4 h-4" />
                Visualize Chapter {chapter}
              </Button>
            </Link>
            <Link href={`/experience/${book.id}?chapter=${chapter}`}>
              <Button size="default" variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Open cinematic
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
