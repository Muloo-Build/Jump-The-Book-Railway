import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import Layout from "@/components/layout";
import { DEMO_BOOKS } from "@/data/books";
import { useLibrary } from "@/lib/library";
import {
  useRemoteSceneLibrary,
  useRemoteBooks,
  type RemoteScene,
} from "@/hooks/useApiLibrary";
import { useUserBibleSummaries } from "@/hooks/useBookBible";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { Show } from "@clerk/react";
import ReadingStats from "@/components/reading-stats";
import LibraryBookTile from "@/components/library-book-tile";
import NowReadingHero from "@/components/now-reading-hero";
import SceneLibrary from "@/components/scene-library";
import WelcomeHero from "@/components/welcome-hero";
import SnapCoverButton from "@/components/snap-cover-button";

const norm = (s: string) => s.trim().toLowerCase();

export default function Library() {
  const { userLibrary, isSignedIn, activeBookId } = useLibrary();
  const sceneLib = useRemoteSceneLibrary();
  const remoteBooks = useRemoteBooks();
  const bibleSummariesQ = useUserBibleSummaries();
  // wouter's useSearch returns the live query string (without the leading "?")
  // and re-renders on EVERY navigation, including query-string-only changes —
  // useLocation alone misses those when the path is unchanged.
  const search = useSearch();
  const q = useMemo(
    () => new URLSearchParams(search).get("q")?.trim() ?? "",
    [search],
  );
  const filteredLibrary = useMemo(() => {
    if (!q) return userLibrary;
    const needle = q.toLowerCase();
    return userLibrary.filter(
      (b) =>
        b.title.toLowerCase().includes(needle) ||
        b.author.toLowerCase().includes(needle),
    );
  }, [userLibrary, q]);

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

  // Bibles are stored against the backend UUID (user_books.id). Library tiles
  // use the *display* id (demoBookId slug for demo books, UUID for the rest),
  // so translate UUID → displayId via bookIdMap so the badge appears on
  // demo-mapped tiles too.
  const bibleBookIds = useMemo(() => {
    const set = new Set<string>();
    (bibleSummariesQ.data?.summaries ?? []).forEach((s) => {
      set.add(s.userBookId);
      const mapped = bookIdMap.get(s.userBookId);
      if (mapped) set.add(mapped.displayId);
    });
    return set;
  }, [bibleSummariesQ.data, bookIdMap]);

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

  // Resolve the canonical user_books UUID for the now-reading book so we can
  // pull its latest generated scene out of sceneLib. We prefer the explicit
  // remoteId (set after a server roundtrip), then demoBookId / direct id
  // matches, and only fall back to title+author normalization as a last
  // resort — that fallback can match the wrong row when a user has both an
  // upload and a demo of the same book.
  const latestSceneForNowReading = useMemo<RemoteScene | null>(() => {
    if (!nowReading) return null;
    const books = remoteBooks.data ?? [];
    const remote =
      (nowReading.remoteId &&
        books.find((b) => b.id === nowReading.remoteId)) ||
      books.find(
        (b) => b.id === nowReading.id || b.demoBookId === nowReading.id,
      ) ||
      books.find(
        (b) =>
          norm(b.title) === norm(nowReading.title) &&
          norm(b.author) === norm(nowReading.author),
      );
    if (!remote) return null;
    const scenes = (sceneLib.data ?? []).filter(
      (s) => s.userBookId === remote.id,
    );
    if (scenes.length === 0) return null;
    return [...scenes].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
  }, [nowReading, remoteBooks.data, sceneLib.data]);

  const hasBooks = userLibrary.length > 0;
  const totalScenes = sceneLib.data?.length ?? 0;

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-10 md:py-12 space-y-10 md:space-y-12">
        <WelcomeHero nowReading={nowReading} totalBooks={userLibrary.length} />

        {nowReading && (
          <NowReadingHero
            book={nowReading}
            latestScene={latestSceneForNowReading}
          />
        )}

        <ReadingStats nowReading={nowReading} />

        <Show when="signed-in">
          {hasBooks ? (
            // Softer banner once they have books — this is now a quiet "add another"
            <div className="rounded-xl border border-border/50 bg-card/30 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-[var(--jtb-accent-hi)]/80 shrink-0" />
                <p className="text-sm text-muted-foreground truncate">
                  Reading something new? Add it with Smart Setup.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SnapCoverButton className="h-8 px-3 text-xs" />
                <Link
                  href="/setup-book"
                  className="inline-flex items-center justify-center rounded-md border border-primary/40 text-[var(--jtb-accent-hi)] hover:bg-primary/10 h-8 px-3 text-xs font-medium transition-colors"
                >
                  Add a book
                </Link>
              </div>
            </div>
          ) : (
            // Bigger banner only when the library is empty
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-[var(--jtb-accent-hi)] text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Your shelf, brought to life
                </div>
                <h3 className="font-serif text-xl font-semibold">
                  Every book you're reading — in one place.
                </h3>
                <p className="text-sm text-muted-foreground">
                  Paperback, Kindle, Audible, library copy — track them all on
                  one shelf. Then, for any chapter you've reached, we'll paint
                  a cinematic scene of the moment. Spoiler-free, always.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <Link
                  href="/setup-book"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-black h-10 px-4 py-2 font-medium hover:bg-[var(--jtb-accent-hi)] transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add a book
                </Link>
                <SnapCoverButton className="h-10 px-4 text-sm" />
              </div>
            </div>
          )}
        </Show>

        <Show when="signed-out">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[var(--jtb-accent-hi)] text-sm font-medium">
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
                className="inline-flex items-center justify-center rounded-md bg-primary text-black h-10 px-4 py-2 font-medium hover:bg-[var(--jtb-accent-hi)] transition-colors"
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

        <div className="space-y-5">
          <div className="flex items-end justify-between border-b border-border/40 pb-2 gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold leading-tight">
                My books
              </h2>
              {hasBooks && (
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {q ? (
                    <>
                      Showing {filteredLibrary.length} of {userLibrary.length}{" "}
                      for “{q}”
                    </>
                  ) : (
                    <>
                      Your shelf · {userLibrary.length}{" "}
                      {userLibrary.length === 1 ? "book" : "books"}
                    </>
                  )}
                </p>
              )}
            </div>
            {q ? (
              <Link
                href="/library"
                className="text-xs text-[var(--jtb-accent-hi)]/80 hover:text-[var(--jtb-accent-hi)] transition-colors"
              >
                Clear search ✕
              </Link>
            ) : (
              hasBooks &&
              userLibrary.length > 6 && (
                <Link
                  href="#my-books"
                  className="text-xs text-[var(--jtb-accent-hi)]/80 hover:text-[var(--jtb-accent-hi)] transition-colors"
                >
                  Browse all →
                </Link>
              )
            )}
          </div>
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
                <SnapCoverButton className="h-10 px-4 text-sm" />
                <Link href="/upload">
                  <div className="inline-flex items-center justify-center rounded-md border border-border h-10 px-4 py-2 font-medium hover:bg-card transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> Upload a file
                  </div>
                </Link>
              </div>
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground">
              No books match “{q}”.{" "}
              <Link
                href="/library"
                className="text-[var(--jtb-accent-hi)] hover:text-[var(--jtb-accent-hi)] underline underline-offset-2"
              >
                Clear search
              </Link>{" "}
              or{" "}
              <Link
                href="/setup-book"
                className="text-[var(--jtb-accent-hi)] hover:text-[var(--jtb-accent-hi)] underline underline-offset-2"
              >
                add a new book
              </Link>
              .
            </div>
          ) : (
            <div
              id="my-books"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5"
            >
              {filteredLibrary.map((book, i) => (
                <LibraryBookTile
                  key={book.id}
                  book={book}
                  index={i}
                  hasBible={bibleBookIds.has(book.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Personal scene gallery — only for signed-in users */}
        {isSignedIn && (
          <div className="space-y-5">
            <div className="flex items-end justify-between border-b border-border/40 pb-2 gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold leading-tight">
                  Scene library
                </h2>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Recently visualized · {totalScenes} total
                </p>
              </div>
              {totalScenes > 8 && (
                <Link
                  href="#scenes"
                  className="text-xs text-[var(--jtb-accent-hi)]/80 hover:text-[var(--jtb-accent-hi)] transition-colors"
                >
                  Browse all →
                </Link>
              )}
            </div>

            {sceneLib.isLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your scenes…
              </div>
            ) : totalScenes === 0 ? (
              // Empty state — without it the section was just a header with
              // "0 total" floating in space, leaving signed-in newcomers with
              // no idea how to populate it.
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-8 text-center space-y-3">
                <p className="font-serif text-lg">
                  No scenes yet — pick a book to start visualizing.
                </p>
                <p className="text-xs text-muted-foreground">
                  Open any book and tap{" "}
                  <span className="text-[var(--jtb-accent-hi)]/90">Generate scenes</span>{" "}
                  to bring a chapter to life.
                </p>
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-2 rounded-md bg-primary text-black hover:bg-[var(--jtb-accent-hi)] h-9 px-4 text-sm font-semibold transition-colors"
                >
                  Browse the catalogue
                </Link>
              </div>
            ) : (
              <div id="scenes">
                <SceneLibrary
                  scenes={sceneLib.data ?? []}
                  bookIdMap={bookIdMap}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-5">
          <div className="border-b border-border/40 pb-2">
            <h2 className="font-serif text-2xl font-semibold leading-tight">
              Classics
            </h2>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Curated demo books · ready to visualize
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {DEMO_BOOKS.map((book, i) => (
              <LibraryBookTile key={book.id} book={book} index={i} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
