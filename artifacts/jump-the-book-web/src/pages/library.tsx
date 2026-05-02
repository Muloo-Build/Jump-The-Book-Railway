import { useMemo } from "react";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { DEMO_BOOKS } from "@/data/books";
import { useLibrary } from "@/lib/library";
import {
  useRemoteSceneLibrary,
  useRemoteBooks,
} from "@/hooks/useApiLibrary";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { Show } from "@clerk/react";
import ReadingStats from "@/components/reading-stats";
import LibraryBookTile from "@/components/library-book-tile";
import NowReadingHero from "@/components/now-reading-hero";
import SceneLibrary from "@/components/scene-library";

export default function Library() {
  const { userLibrary, isSignedIn, activeBookId } = useLibrary();
  const sceneLib = useRemoteSceneLibrary();
  const remoteBooks = useRemoteBooks();

  // Build a lookup from remote book uuid → display id (demoBookId or uuid)
  const bookIdMap = useMemo(() => {
    const map = new Map<string, { displayId: string; title: string }>();
    (remoteBooks.data ?? []).forEach((b) => {
      map.set(b.id, {
        displayId: b.demoBookId || b.id,
        title: b.title,
      });
    });
    return map;
  }, [remoteBooks.data]);

  // Pick the "now reading" book: the active one if it still exists, else the
  // most-recently-updated book in the library (API returns books ordered by
  // updatedAt desc).
  const nowReading = useMemo(() => {
    if (userLibrary.length === 0) return null;
    if (activeBookId) {
      const match = userLibrary.find((b) => b.id === activeBookId);
      if (match) return match;
    }
    return userLibrary[0] ?? null;
  }, [userLibrary, activeBookId]);

  const hasBooks = userLibrary.length > 0;

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-12 space-y-12">
        <div>
          <h1 className="font-serif text-4xl font-bold mb-4">Your Library</h1>
          <p className="text-muted-foreground text-lg">
            Pick up where you left off, or start a new journey.
          </p>
        </div>

        {nowReading && <NowReadingHero book={nowReading} />}

        <ReadingStats />

        <Show when="signed-in">
          {hasBooks ? (
            // Softer banner once they have books — this is now a quiet "add another"
            <div className="rounded-xl border border-border/50 bg-card/30 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-300/80 shrink-0" />
                <p className="text-sm text-muted-foreground truncate">
                  Reading something new? Add it with Smart Setup.
                </p>
              </div>
              <Link
                href="/setup-book"
                className="inline-flex items-center justify-center rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 h-8 px-3 text-xs font-medium transition-colors shrink-0"
              >
                Add a book
              </Link>
            </div>
          ) : (
            // Bigger banner only when the library is empty
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-amber-300/5 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-amber-300 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Smart Setup
                </div>
                <h3 className="font-serif text-xl font-semibold">
                  Reading something we don't have a file of?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add any modern book by title and author — Kindle, Audible,
                  hardcover, anything. We'll build a story profile and visualize
                  your reading position spoiler-free.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href="/setup-book"
                  className="inline-flex items-center justify-center rounded-md bg-amber-400 text-black h-10 px-4 py-2 font-medium hover:bg-amber-300 transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add a book
                </Link>
              </div>
            </div>
          )}
        </Show>

        <Show when="signed-out">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-amber-300 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Save your collection
              </div>
              <p className="text-base text-foreground">
                Sign in and every scene you generate is saved to your personal
                cinematic library — across devices, forever.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-amber-400 text-black h-10 px-4 py-2 font-medium hover:bg-amber-300 transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-md border border-white/20 h-10 px-4 py-2 font-medium hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Show>

        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-semibold border-b border-border/40 pb-2">
            My Books
          </h2>
          {!hasBooks ? (
            <div className="rounded-xl border border-dashed border-border/50 p-12 text-center flex flex-col items-center gap-3">
              <p className="text-muted-foreground mb-2">
                Your library is empty.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/setup-book">
                  <div className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 font-medium hover:bg-primary/90 transition-colors">
                    <Sparkles className="mr-2 h-4 w-4" /> Smart Setup
                  </div>
                </Link>
                <Link href="/upload">
                  <div className="inline-flex items-center justify-center rounded-md border border-border h-10 px-4 py-2 font-medium hover:bg-card transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> Upload a file
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {userLibrary.map((book, i) => (
                <LibraryBookTile key={book.id} book={book} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Personal scene gallery — only for signed-in users */}
        {isSignedIn && (
          <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-border/40 pb-2">
              <div>
                <h2 className="font-serif text-2xl font-semibold">
                  Your Scene Library
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Every cinematic moment you've unlocked, grouped by book.
                </p>
              </div>
              {sceneLib.data && sceneLib.data.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {sceneLib.data.length}{" "}
                  {sceneLib.data.length === 1 ? "scene" : "scenes"}
                </span>
              )}
            </div>

            {sceneLib.isLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your scenes…
              </div>
            ) : (
              <SceneLibrary
                scenes={sceneLib.data ?? []}
                bookIdMap={bookIdMap}
              />
            )}
          </div>
        )}

        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-semibold border-b border-border/40 pb-2">
            Classics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {DEMO_BOOKS.map((book, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={book.id}
              >
                <Link href={`/book/${book.id}`}>
                  <Card className="overflow-hidden hover:ring-2 ring-primary/50 transition-all cursor-pointer h-full border-border/40 bg-card/50">
                    <div
                      className="aspect-[2/3] w-full relative"
                      style={{
                        background: `linear-gradient(to bottom right, ${book.coverGradient[0]}, ${book.coverGradient[1]})`,
                      }}
                    >
                      {book.heroImage && (
                        <img
                          src={`${import.meta.env.BASE_URL}images/${book.heroImage}.png`}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-serif font-bold line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {book.author}
                      </p>
                      <p className="text-xs text-primary mt-2">
                        {book.tagline}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
