import { useMemo } from "react";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import {
  useRemoteSceneLibrary,
  useRemoteBooks,
  type RemoteScene,
} from "@/hooks/useApiLibrary";
import { motion } from "framer-motion";
import { Play, Layers, BookOpen } from "lucide-react";
import { Show } from "@clerk/react";
import { useOpenLibraryEnrichment } from "@/hooks/useOpenLibraryEnrichment";
import { Progress } from "@/components/ui/progress";

const norm = (s: string) => s.trim().toLowerCase();

interface NowReadingCardProps {
  book: ReturnType<typeof useLibrary>["userLibrary"][number];
  latestScene: RemoteScene | null;
  sceneCount: number;
}

function NowReadingCard({ book, latestScene, sceneCount }: NowReadingCardProps) {
  const localCover = book.heroImage;
  const hasLocalCover = !!localCover;
  const persistedCover = book.coverUrl ?? null;
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
  const gradient = book.coverGradient ?? [];
  const gradFrom = gradient[0] ?? "#1a1525";
  const gradTo = gradient[1] ?? gradient[0] ?? "#453560";
  const heroImage = latestScene?.imageUrl || cover;
  const resumeHref = `/experience/${book.id}?chapter=${chapter}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden flex flex-col"
    >
      <div
        className="relative aspect-[3/2] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
        }}
      >
        {heroImage && (
          <img
            src={heroImage}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-white/70 font-medium uppercase bg-black/30 rounded-full px-2.5 py-1">
          <BookOpen className="w-3 h-3" />
          Chapter {chapter}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        <div className="space-y-1">
          <Link href={`/book/${book.id}`}>
            <h2 className="font-serif text-lg font-bold leading-tight hover:text-[var(--jtb-accent-hi)] transition-colors line-clamp-2">
              {book.title}
            </h2>
          </Link>
          <p className="text-xs text-muted-foreground">{book.author}</p>
        </div>

        {progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>{sceneCount} scene{sceneCount !== 1 ? "s" : ""}</span>
          </div>
          {book.currentChapter && (
            <span>Ch {book.currentChapter}</span>
          )}
        </div>

        {latestScene?.imageUrl && (
          <div className="rounded-lg overflow-hidden border border-border/30">
            <Link href={`/experience/${book.id}?chapter=${latestScene.chapterNumber}`}>
              <div className="relative aspect-video">
                <img
                  src={latestScene.imageUrl}
                  alt={latestScene.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[10px] text-white/80 font-medium line-clamp-1">
                    Latest: {latestScene.title}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Mobile-first CTA row: primary Continue takes the lion's share so
            it's an obvious thumb target on small screens; Scenes is a fixed
            secondary. We dropped the prior "Generate" button — it pointed
            to the same /experience URL as Continue, so it was a confusing
            duplicate that just stole tap target area from the real action. */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Link
            href={resumeHref}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)] h-11 sm:h-10 px-4 text-sm font-semibold transition-colors"
          >
            <Play className="w-4 h-4" />
            Continue
          </Link>
          <Link
            href={`/book/${book.id}#scenes`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] h-11 sm:h-10 px-4 text-sm font-medium transition-colors"
          >
            <Layers className="w-4 h-4" />
            Scenes
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function NowReading() {
  const { userLibrary, isSignedIn } = useLibrary();
  const remoteBooks = useRemoteBooks();
  const sceneLib = useRemoteSceneLibrary();

  const readingBooks = useMemo(
    () => userLibrary.filter((b) => (b.readingStatus ?? "reading") === "reading" && (b.progress ?? 0) < 100),
    [userLibrary],
  );

  const sceneCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!sceneLib.data || !remoteBooks.data) return map;
    for (const scene of sceneLib.data) {
      map.set(scene.userBookId, (map.get(scene.userBookId) ?? 0) + 1);
    }
    return map;
  }, [sceneLib.data, remoteBooks.data]);

  const getSceneCount = (book: (typeof userLibrary)[number]) => {
    const books = remoteBooks.data ?? [];
    const remote =
      (book.remoteId && books.find((b) => b.id === book.remoteId)) ||
      books.find((b) => b.id === book.id || b.demoBookId === book.id) ||
      books.find(
        (b) => norm(b.title) === norm(book.title) && norm(b.author) === norm(book.author),
      );
    return remote ? (sceneCountMap.get(remote.id) ?? 0) : 0;
  };

  const getLatestScene = (book: (typeof userLibrary)[number]): RemoteScene | null => {
    const books = remoteBooks.data ?? [];
    const remote =
      (book.remoteId && books.find((b) => b.id === book.remoteId)) ||
      books.find((b) => b.id === book.id || b.demoBookId === book.id) ||
      books.find(
        (b) => norm(b.title) === norm(book.title) && norm(b.author) === norm(book.author),
      );
    if (!remote) return null;
    const scenes = (sceneLib.data ?? []).filter((s) => s.userBookId === remote.id);
    if (scenes.length === 0) return null;
    return [...scenes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-10 md:py-12 space-y-6 sm:space-y-8">
        <div className="space-y-1.5 sm:space-y-2">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">Now Reading</h1>
          <p className="text-sm text-muted-foreground">
            {readingBooks.length === 0
              ? "No books currently in progress"
              : `${readingBooks.length} book${readingBooks.length !== 1 ? "s" : ""} in progress`}
          </p>
        </div>

        <Show when="signed-out">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 md:p-8 text-center space-y-4">
            <p className="text-sm sm:text-base text-foreground">
              Sign in to track your reading progress and see your active books here.
            </p>
            {/* Stack CTAs on mobile so each gets a comfortable full-width
                tap target; revert to inline once there's room for both. */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-11 sm:h-10 px-4 py-2 text-sm font-semibold hover:bg-[var(--jtb-accent-hi)] transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-md border border-white/20 h-11 sm:h-10 px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Show>

        {readingBooks.length === 0 && isSignedIn && (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-6 sm:p-10 text-center space-y-4">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <div className="space-y-2">
              <p className="font-serif text-lg">Nothing on the nightstand</p>
              <p className="text-sm text-muted-foreground">
                Head to your bookshelf to pick something up, or add a new book.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
              <Link
                href="/library"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)] h-11 sm:h-10 px-4 text-sm font-semibold transition-colors"
              >
                Go to Bookshelf
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] h-11 sm:h-10 px-4 text-sm font-medium transition-colors"
              >
                Add a book
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {readingBooks.map((book) => (
            <NowReadingCard
              key={book.id}
              book={book}
              latestScene={getLatestScene(book)}
              sceneCount={getSceneCount(book)}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}
