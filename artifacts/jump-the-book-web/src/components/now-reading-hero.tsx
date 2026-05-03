import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Layers } from "lucide-react";
import { useOpenLibraryEnrichment } from "@/hooks/useOpenLibraryEnrichment";
import type { UserLibraryItem } from "@/data/books";
import type { RemoteScene } from "@/hooks/useApiLibrary";

interface Props {
  book: UserLibraryItem;
  /** Most recent generated scene for this book, if any. Used for the
   *  hero image, chapter label and italic narration quote. */
  latestScene?: RemoteScene | null;
}

/**
 * Magazine-style "Continue reading" hero pinned to the top of the library.
 * Image-left, metadata + quote + actions on the right. Falls back to the
 * cover gradient + ambient blur when no scene image exists yet.
 */
export default function NowReadingHero({ book, latestScene }: Props) {
  const localCover = book.heroImage;
  const hasLocalCover = !!localCover;
  const persistedCover = book.coverUrl ?? null;
  // Only ask Open Library when neither a bundled cover nor a server-cached
  // cover URL is available — otherwise we'd hit OL on every hero render.
  const needsOl = !hasLocalCover && !persistedCover;
  const enrichment = useOpenLibraryEnrichment(book.title, book.author, {
    enabled: needsOl,
  });
  const cover =
    hasLocalCover && localCover
      ? localCover.startsWith("http") || localCover.startsWith("/")
        ? localCover
        : null
      : (persistedCover ?? enrichment.coverUrl);

  const progress = Math.max(0, Math.min(100, book.progress ?? 0));
  const chapter = latestScene?.chapterNumber ?? book.currentChapter ?? 1;
  const sceneIndex = latestScene?.sceneIndex;
  const gradient = book.coverGradient ?? [];
  const gradFrom = gradient[0] ?? "#1a1525";
  const gradTo = gradient[1] ?? gradient[0] ?? "#453560";

  // The hero stage prefers the latest scene image so the page feels
  // alive; fallback to the book cover, then the gradient.
  const heroImage = latestScene?.imageUrl || cover;

  // The italic quote — narration if we have it, otherwise the book's
  // tagline, otherwise a soft default.
  const quote =
    (latestScene?.narration ?? "").trim() ||
    (book.tagline ?? "").trim() ||
    "The next scene is queued and waiting.";

  // Approx "time left" — only show if we know enough to be useful.
  const timeLeft = progress > 0 && progress < 100 ? `${100 - progress}% to go` : null;

  const resumeHref = `/experience/${book.id}?chapter=${chapter}`;
  const allScenesHref = `/book/${book.id}#scenes`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-background"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Stage / image */}
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
            }}
          />
          {heroImage && (
            <img
              src={heroImage}
              alt={latestScene?.title ?? book.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          {/* subtle vignette so caption sits well */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top-left chapter pill */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-2 text-[10px] tracking-[0.22em] text-white/70 font-medium uppercase">
            <span>Chapter {chapter}</span>
            {sceneIndex !== undefined && sceneIndex !== null && (
              <>
                <span className="text-white/30">·</span>
                <span>Scene {sceneIndex}</span>
              </>
            )}
          </div>

          {/* Italic caption pulled from the scene title */}
          {latestScene?.title && (
            <div className="absolute bottom-4 left-4 right-4 text-xs italic text-white/75 line-clamp-2">
              {latestScene.title}
            </div>
          )}
        </div>

        {/* Text column */}
        <div className="relative p-6 md:p-8 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <Link href={`/book/${book.id}`}>
                <h2 className="font-serif text-2xl md:text-3xl font-bold leading-tight hover:text-amber-200 transition-colors line-clamp-2">
                  {book.title}
                </h2>
              </Link>
              <p className="text-sm text-muted-foreground">
                {book.author}
                {progress > 0 && (
                  <>
                    <span className="mx-2 text-muted-foreground/40">·</span>
                    <span>{progress}%</span>
                  </>
                )}
                {timeLeft && (
                  <>
                    <span className="mx-2 text-muted-foreground/40">·</span>
                    <span>{timeLeft}</span>
                  </>
                )}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-amber-400/50 bg-amber-400/20 text-amber-100 text-[10px] tracking-[0.2em] uppercase font-medium px-2 py-1">
              Continue reading
            </span>
          </div>

          <blockquote className="font-serif italic text-base md:text-lg text-foreground/90 leading-relaxed border-l-2 border-amber-400/40 pl-4 line-clamp-4">
            “{quote}”
          </blockquote>

          {progress > 0 && (
            <div className="space-y-1.5">
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 to-amber-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={resumeHref}
              className="inline-flex items-center gap-2 rounded-md bg-amber-400 text-black hover:bg-amber-300 h-10 px-4 text-sm font-semibold transition-colors"
            >
              <Play className="w-4 h-4" />
              Resume
            </Link>
            <Link
              href={allScenesHref}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] h-10 px-4 text-sm font-medium transition-colors"
            >
              <Layers className="w-4 h-4" />
              All scenes
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
