import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Sparkles, Upload as UploadIcon, Wand2, Compass, TrendingUp, BookOpen, Flame } from "lucide-react";
import Layout from "@/components/layout";
import { DEMO_BOOKS } from "@/data/books";
import { useRemoteSceneLibrary, useRemoteBooks } from "@/hooks/useApiLibrary";
import { useLibrary } from "@/lib/library";
import { useTrending, type TrendingBook } from "@/hooks/useTrending";
import { useOpenLibraryEnrichment } from "@/hooks/useOpenLibraryEnrichment";
import LibraryBookTile from "@/components/library-book-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface Category {
  id: string;
  title: string;
  subtitle: string;
  bookIds: string[];
}

const CATEGORIES: Category[] = [
  {
    id: "wonder",
    title: "Wonder & whimsy",
    subtitle: "Fantastical worlds with a soft glow",
    bookIds: ["alice"],
  },
  {
    id: "shadow",
    title: "Shadow & dread",
    subtitle: "Gothic, candlelit, slow-burn unease",
    bookIds: ["dracula", "frankenstein"],
  },
  {
    id: "case",
    title: "Cases to crack",
    subtitle: "Foggy streets, sharp minds",
    bookIds: ["sherlock"],
  },
];

/**
 * Cover-first trending card.
 *
 * Earlier versions displayed up-to-4 generated scene images sourced
 * from the cross-user image cache, which leaked one user's generations
 * to every anonymous Discover visitor. The /api/trending route no
 * longer returns those URLs (`sampleImages` is always empty).
 *
 * We now lead with the public Open Library cover for the title+author
 * and keep activity numbers as a thin metadata strip at the bottom.
 */
function TrendingBookCard({ book, index }: { book: TrendingBook; index: number }) {
  const searchUrl = `/setup-book?title=${encodeURIComponent(book.bookTitle)}&author=${encodeURIComponent(book.author)}`;
  const enrichment = useOpenLibraryEnrichment(book.bookTitle, book.author);
  // Track image-load failures so we fall back to the title placeholder
  // instead of leaving an empty box (broken/expired OL cover URLs).
  const [imgFailed, setImgFailed] = useState(false);
  const coverUrl = imgFailed ? null : enrichment.coverUrl;
  const showFallback = !coverUrl && !enrichment.loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link href={searchUrl}>
        <Card className="group overflow-hidden hover:ring-2 ring-primary/50 transition-all cursor-pointer h-full border-border/40 bg-card/50">
          <div className="aspect-[2/3] w-full relative bg-gradient-to-br from-primary/15 to-primary/5">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={`Cover of ${book.bookTitle}`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={() => setImgFailed(true)}
              />
            ) : enrichment.loading ? (
              <Skeleton className="absolute inset-0 w-full h-full" />
            ) : null}
            {showFallback && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <BookOpen className="w-10 h-10 text-primary/40" />
                <span className="font-serif text-sm text-foreground/70 line-clamp-3">
                  {book.bookTitle}
                </span>
              </div>
            )}
            {index < 3 && (
              <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm px-2 py-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] uppercase tracking-wider text-white font-semibold">
                  Hot
                </span>
              </div>
            )}
          </div>
          <CardContent className="p-3 sm:p-4 space-y-1.5">
            <h3 className="font-serif font-bold line-clamp-1 text-sm sm:text-base">{book.bookTitle}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {book.author}
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                {book.sceneCount} {book.sceneCount === 1 ? "scene" : "scenes"}
              </span>
              {book.uniqueChapters > 1 && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80 px-1.5 py-0">
                  {book.uniqueChapters} chapters
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function TrendingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/40 bg-card/50">
          <Skeleton className="aspect-[3/4] w-full" />
          <CardContent className="p-3 sm:p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Discover() {
  const sceneLib = useRemoteSceneLibrary();
  const remoteBooks = useRemoteBooks();
  const { isSignedIn } = useLibrary();
  const trending = useTrending();

  const explored = useMemo(() => {
    const liveIds = new Set((remoteBooks.data ?? []).map((b) => b.id));
    const titleById = new Map(
      (remoteBooks.data ?? []).map((b) => [b.id, b.title] as const),
    );
    const counts = new Map<string, number>();
    (sceneLib.data ?? []).forEach((s) => {
      if (!liveIds.has(s.userBookId)) return;
      counts.set(s.userBookId, (counts.get(s.userBookId) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({
        id,
        count,
        title: titleById.get(id) ?? "Book",
      }));
  }, [sceneLib.data, remoteBooks.data]);

  const totalScenes = explored.reduce((sum, e) => sum + e.count, 0);

  const trendingBooks = trending.data?.books ?? [];
  const hasTrending = trendingBooks.length > 0;

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-10 md:py-12 space-y-8 sm:space-y-10 md:space-y-12">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[var(--jtb-accent-hi)]/90 font-medium">
            <Compass className="w-3.5 h-3.5" />
            Discover
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight">
            Find your <span className="italic text-[var(--jtb-accent-hi)]">next</span> scene.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
            Browse our curated catalogue, jump into a public-domain classic, or
            bring any book of your own — Kindle, hardcover, audiobook, anything.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/setup-book"
            className="group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5 sm:p-6 flex items-start gap-4 hover:border-primary/60 transition-colors"
          >
            <div className="shrink-0 rounded-xl bg-primary/15 text-[var(--jtb-accent-hi)] p-3">
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-[var(--jtb-accent-hi)]/90 font-medium">
                Smart Setup
              </div>
              <h3 className="font-serif text-lg font-semibold">
                Add a modern book by title
              </h3>
              <p className="text-sm text-muted-foreground">
                We'll build a spoiler-safe story profile so the scenes match
                what you've already read.
              </p>
            </div>
          </Link>
          <Link
            href="/upload"
            className="group rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6 flex items-start gap-4 hover:border-border transition-colors"
          >
            <div className="shrink-0 rounded-xl bg-white/5 text-foreground/80 p-3">
              <UploadIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Upload a file
              </div>
              <h3 className="font-serif text-lg font-semibold">
                Drop in an EPUB or text
              </h3>
              <p className="text-sm text-muted-foreground">
                We'll parse the chapters and let you visualize any one of them
                immediately.
              </p>
            </div>
          </Link>
        </section>

        {(hasTrending || trending.isLoading) && (
          <section className="space-y-5">
            <div className="border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--jtb-accent-hi)]" />
                <h2 className="font-serif text-2xl font-semibold leading-tight">
                  Popular right now
                </h2>
              </div>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Books our community is reading and generating scenes for
              </p>
            </div>
            {trending.isLoading ? (
              <TrendingSkeleton />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {trendingBooks.map((book, i) => (
                  <TrendingBookCard key={`${book.bookTitle}-${book.author}`} book={book} index={i} />
                ))}
              </div>
            )}
          </section>
        )}

        {isSignedIn && totalScenes > 0 && (
          <section className="space-y-5">
            <div className="border-b border-border/40 pb-2">
              <h2 className="font-serif text-2xl font-semibold leading-tight">
                Most explored
              </h2>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Books you've turned into the most cinematic moments
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {explored.map((e) => (
                <Link
                  key={e.id}
                  href={`/book/${e.id}`}
                  className="group rounded-xl border border-border/40 bg-card/40 p-4 hover:border-primary/40 transition-colors block"
                >
                  <div className="font-serif text-3xl leading-none">
                    {e.count}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mt-2">
                    Scenes
                  </div>
                  <div className="font-serif text-sm text-foreground/90 mt-2 line-clamp-2">
                    {e.title}
                  </div>
                  <div className="text-[11px] text-[var(--jtb-accent-hi)]/80 mt-1 group-hover:text-[var(--jtb-accent-hi)]">
                    Open →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {CATEGORIES.map((cat) => {
          const books = cat.bookIds
            .map((id) => DEMO_BOOKS.find((b) => b.id === id))
            .filter(Boolean) as typeof DEMO_BOOKS;
          if (books.length === 0) return null;
          return (
            <section key={cat.id} className="space-y-5">
              <div className="border-b border-border/40 pb-2">
                <h2 className="font-serif text-2xl font-semibold leading-tight">
                  {cat.title}
                </h2>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {cat.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {books.map((book, i) => (
                  <LibraryBookTile key={book.id} book={book} index={i} />
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl border border-border/50 bg-card/30 p-5 sm:p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 max-w-xl">
            <Sparkles className="w-5 h-5 text-[var(--jtb-accent-hi)]/90 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Don't see what you're reading? Add it with Smart Setup and we'll
              build a spoiler-safe profile so every scene fits the story.
            </p>
          </div>
          <Link
            href="/setup-book"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)] h-10 px-4 text-sm font-semibold transition-colors shrink-0"
          >
            <Wand2 className="w-4 h-4" />
            Open Smart Setup
          </Link>
        </section>
      </div>
    </Layout>
  );
}
