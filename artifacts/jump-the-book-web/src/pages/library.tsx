import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import Layout from "@/components/layout";
import { DEMO_BOOKS } from "@/data/books";
import type { ReadingStatus } from "@/data/books";
import { useLibrary } from "@/lib/library";
import {
  useRemoteSceneLibrary,
  useRemoteBooks,
  type RemoteScene,
} from "@/hooks/useApiLibrary";
import { useUserBibleSummaries } from "@/hooks/useBookBible";
import { motion } from "framer-motion";
import { Plus, Sparkles, Loader2, BookOpen, BookMarked, CheckCircle2, ChevronDown } from "lucide-react";
import { Show } from "@clerk/react";
import ReadingStats from "@/components/reading-stats";
import LibraryBookTile from "@/components/library-book-tile";
import SeriesBookGrid from "@/components/series-book-grid";
import NowReadingHero from "@/components/now-reading-hero";
import SceneLibrary from "@/components/scene-library";
import WelcomeHero from "@/components/welcome-hero";
import SnapCoverButton from "@/components/snap-cover-button";
import BookSearch from "@/components/book-search";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.trim().toLowerCase();

const STATUS_TABS: { key: ReadingStatus | "all"; label: string; icon: typeof BookOpen }[] = [
  { key: "all", label: "All", icon: BookOpen },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "want-to-read", label: "Want to Read", icon: BookMarked },
  { key: "finished", label: "Finished", icon: CheckCircle2 },
];

export default function Library() {
  const { userLibrary, isSignedIn, activeBookId } = useLibrary();
  const sceneLib = useRemoteSceneLibrary();
  const remoteBooks = useRemoteBooks();
  const bibleSummariesQ = useUserBibleSummaries();
  const search = useSearch();
  const q = useMemo(
    () => new URLSearchParams(search).get("q")?.trim() ?? "",
    [search],
  );
  const [activeTab, setActiveTab] = useState<ReadingStatus | "all">("all");

  // Persist per-series collapsed state in localStorage so a reader's preferred
  // layout (e.g. Discworld collapsed) survives page reloads. We key by the
  // normalized series name so capitalization tweaks don't desync state.
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem("jtb:collapsedSeries");
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    } catch {
      // Ignore corrupted storage and fall back to empty set.
    }
    return new Set();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "jtb:collapsedSeries",
        JSON.stringify([...collapsedSeries]),
      );
    } catch {
      // Storage may be unavailable (private mode, quota); ignore.
    }
  }, [collapsedSeries]);

  const toggleSeriesCollapsed = useCallback((name: string) => {
    const key = name.trim().toLowerCase();
    setCollapsedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const filteredLibrary = useMemo(() => {
    let list = userLibrary;
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle),
      );
    }
    if (activeTab !== "all") {
      list = list.filter((b) => {
        const status = b.readingStatus ?? (b.progress != null && b.progress >= 100 ? "finished" : "reading");
        return status === activeTab;
      });
    }
    return [...list].sort((a, b) => {
      const sA = a.seriesName?.toLowerCase() ?? "";
      const sB = b.seriesName?.toLowerCase() ?? "";
      if (sA && sB && sA === sB) {
        return (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999);
      }
      if (sA && !sB) return -1;
      if (!sA && sB) return 1;
      if (sA < sB) return -1;
      if (sA > sB) return 1;
      return 0;
    });
  }, [userLibrary, q, activeTab]);

  const seriesGroups = useMemo(() => {
    type GroupBook = typeof filteredLibrary[number];
    type Group = {
      name: string;
      books: GroupBook[];
      finishedCount: number;
      readingCount: number;
      avgProgress: number;
    };
    const groups: Group[] = [];
    const standalone: GroupBook[] = [];
    const seriesMap = new Map<string, GroupBook[]>();
    for (const book of filteredLibrary) {
      const sn = book.seriesName?.trim();
      if (sn) {
        const key = sn.toLowerCase();
        if (!seriesMap.has(key)) seriesMap.set(key, []);
        seriesMap.get(key)!.push(book);
      } else {
        standalone.push(book);
      }
    }
    // Only treat as a "series" when there are 2+ books with the same name —
    // a lone series book is shown alongside standalones to avoid an awkward
    // one-tile group.
    for (const [, books] of seriesMap) {
      if (books.length >= 2) {
        let finishedCount = 0;
        let readingCount = 0;
        let progressSum = 0;
        for (const b of books) {
          const status = b.readingStatus ?? (b.progress != null && b.progress >= 100 ? "finished" : "reading");
          if (status === "finished" || (b.progress ?? 0) >= 100) finishedCount += 1;
          else if (status === "reading" && (b.progress ?? 0) > 0) readingCount += 1;
          progressSum += Math.max(0, Math.min(100, b.progress ?? 0));
        }
        groups.push({
          name: books[0].seriesName!,
          books,
          finishedCount,
          readingCount,
          avgProgress: Math.round(progressSum / books.length),
        });
      } else if (books.length === 1) {
        standalone.push(books[0]);
      }
    }
    // Sort series groups alphabetically for a stable display.
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return { groups, standalone };
  }, [filteredLibrary]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: userLibrary.length, reading: 0, "want-to-read": 0, finished: 0 };
    for (const b of userLibrary) {
      const status = b.readingStatus ?? (b.progress != null && b.progress >= 100 ? "finished" : "reading");
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [userLibrary]);

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

  const sceneCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const scene of sceneLib.data ?? []) {
      map.set(scene.userBookId, (map.get(scene.userBookId) ?? 0) + 1);
    }
    return map;
  }, [sceneLib.data]);

  const getSceneCount = (bookId: string) => {
    const books = remoteBooks.data ?? [];
    const remote =
      books.find((b) => b.demoBookId === bookId) ??
      books.find((b) => b.id === bookId);
    return remote ? (sceneCountMap.get(remote.id) ?? 0) : 0;
  };

  const bibleBookIds = useMemo(() => {
    const set = new Set<string>();
    (bibleSummariesQ.data?.summaries ?? []).forEach((s) => {
      set.add(s.userBookId);
      const mapped = bookIdMap.get(s.userBookId);
      if (mapped) set.add(mapped.displayId);
    });
    return set;
  }, [bibleSummariesQ.data, bookIdMap]);

  const nowReading = useMemo(() => {
    if (userLibrary.length === 0) return null;
    const readingBooks = userLibrary.filter((b) => (b.readingStatus ?? "reading") === "reading" && (b.progress ?? 0) < 100);
    if (activeBookId) {
      const match = readingBooks.find((b) => b.id === activeBookId);
      if (match) return match;
    }
    return readingBooks[0] ?? null;
  }, [userLibrary, activeBookId]);

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
      <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-10 md:py-12 space-y-8 sm:space-y-10 md:space-y-12">
        {/* WelcomeHero is desktop-only — on mobile the slim top bar plus
            the bottom tab nav already orient the user, so a giant greeting
            block above the bookshelf is just clutter. */}
        <div className="hidden sm:block">
          <WelcomeHero nowReading={nowReading} totalBooks={userLibrary.length} />
        </div>

        {nowReading && (
          <div className="hidden sm:block">
            <NowReadingHero
              book={nowReading}
              latestScene={latestSceneForNowReading}
            />
          </div>
        )}

        <ReadingStats nowReading={nowReading} />

        <Show when="signed-in">
          {hasBooks && (
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6 md:p-8 space-y-4">
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-semibold">
                  Add another book
                </h3>
                <p className="text-sm text-muted-foreground">
                  Search by title — we'll pull in the cover and details automatically.
                </p>
              </div>
              <BookSearch />
              <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Other ways:</span>
                <SnapCoverButton className="h-8 px-3 text-xs" />
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center rounded-md border border-border/50 h-8 px-3 text-xs font-medium hover:bg-card transition-colors"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload EPUB
                </Link>
                <Link
                  href="/setup-book"
                  className="inline-flex items-center justify-center rounded-md border border-border/50 h-8 px-3 text-xs font-medium hover:bg-card transition-colors"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Guided setup
                </Link>
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
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 font-medium hover:bg-[var(--jtb-accent-hi)] transition-colors"
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
                My Bookshelf
              </h2>
              {hasBooks && (
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {q ? (
                    <>
                      Showing {filteredLibrary.length} of {userLibrary.length}{" "}
                      for "{q}"
                    </>
                  ) : (
                    <>
                      {userLibrary.length}{" "}
                      {userLibrary.length === 1 ? "book" : "books"}
                    </>
                  )}
                </p>
              )}
            </div>
            {q && (
              <Link
                href="/library"
                className="text-xs text-[var(--jtb-accent-hi)]/80 hover:text-[var(--jtb-accent-hi)] transition-colors"
              >
                Clear search ✕
              </Link>
            )}
          </div>

          {hasBooks && (
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_TABS.map((tab) => {
                const count = statusCounts[tab.key] ?? 0;
                const isActive = activeTab === tab.key;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary/20 text-[var(--jtb-accent-hi)] border border-primary/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent",
                    )}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span className={cn(
                      "text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                      isActive ? "bg-primary/30" : "bg-card/50",
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!hasBooks ? (
            <Show
              when="signed-in"
              fallback={
                <div className="rounded-xl border border-dashed border-border/50 p-12 text-center flex flex-col items-center gap-3">
                  <p className="text-muted-foreground mb-2">
                    Your bookshelf is empty.
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
              }
            >
              <div className="rounded-2xl border border-border/50 bg-card/30 p-6 md:p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-semibold">
                    Add your first book
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Search any title — we'll do the rest.
                  </p>
                </div>
                <BookSearch />
                <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Or:</span>
                  <SnapCoverButton className="h-8 px-3 text-xs" />
                  <Link
                    href="/upload"
                    className="inline-flex items-center justify-center rounded-md border border-border/50 h-8 px-3 text-xs font-medium hover:bg-card transition-colors"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload a file
                  </Link>
                  <Link
                    href="/setup-book"
                    className="inline-flex items-center justify-center rounded-md border border-border/50 h-8 px-3 text-xs font-medium hover:bg-card transition-colors"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Guided setup
                  </Link>
                </div>
              </div>
            </Show>
          ) : filteredLibrary.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground">
              {q ? (
                <>
                  No books match "{q}".{" "}
                  <Link
                    href="/library"
                    className="text-[var(--jtb-accent-hi)] hover:text-[var(--jtb-accent-hi)] underline underline-offset-2"
                  >
                    Clear search
                  </Link>
                </>
              ) : (
                <>
                  No books with status "{STATUS_TABS.find((t) => t.key === activeTab)?.label}".{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="text-[var(--jtb-accent-hi)] hover:text-[var(--jtb-accent-hi)] underline underline-offset-2"
                  >
                    Show all
                  </button>
                </>
              )}
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              id="my-books"
              className="space-y-6"
            >
              {seriesGroups.groups.map((group) => {
                const collapseKey = group.name.trim().toLowerCase();
                const isCollapsed = collapsedSeries.has(collapseKey);
                const headingId = `series-${collapseKey.replace(/[^a-z0-9]+/g, "-")}`;
                const panelId = `${headingId}-panel`;
                return (
                  <div
                    key={group.name}
                    className="rounded-xl border border-border/40 bg-card/20 p-4 md:p-5 space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSeriesCollapsed(group.name)}
                      aria-expanded={!isCollapsed}
                      aria-controls={panelId}
                      className="w-full text-left flex flex-wrap items-center justify-between gap-2 rounded-md -mx-1 px-1 py-0.5 hover:bg-card/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jtb-accent-hi)]/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
                            isCollapsed && "-rotate-90",
                          )}
                          aria-hidden="true"
                        />
                        <BookMarked className="w-4 h-4 text-[var(--jtb-accent-hi)] flex-shrink-0" />
                        <h3
                          id={headingId}
                          className="text-sm font-semibold text-foreground/90 truncate"
                        >
                          {group.name}
                        </h3>
                        <span className="text-[10px] text-muted-foreground rounded-full bg-card/60 px-2 py-0.5 flex-shrink-0">
                          {group.books.length} book{group.books.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-shrink-0">
                        <span>
                          {group.finishedCount}/{group.books.length} finished
                        </span>
                        {group.readingCount > 0 && (
                          <span className="text-[var(--jtb-accent-hi)]/80">
                            · {group.readingCount} in progress
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-card/60 overflow-hidden">
                        <div
                          className="h-full bg-[var(--jtb-accent-hi)]/70 transition-all"
                          style={{ width: `${group.avgProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 tabular-nums w-10 text-right">
                        {group.avgProgress}%
                      </span>
                    </div>
                    {!isCollapsed && (
                      <SeriesBookGrid
                        books={group.books.map((book) => ({
                          ...book,
                          sceneCount: getSceneCount(book.id),
                          seriesOrder: book.seriesOrder,
                          remoteId: book.remoteId,
                        }))}
                        bibleBookIds={bibleBookIds}
                        isSignedIn={isSignedIn}
                        panelId={panelId}
                        headingId={headingId}
                      />
                    )}
                  </div>
                );
              })}
              {seriesGroups.standalone.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
                  {seriesGroups.standalone.map((book, i) => (
                    <LibraryBookTile
                      key={book.id}
                      book={{
                        ...book,
                        sceneCount: getSceneCount(book.id),
                      }}
                      index={i}
                      hasBible={bibleBookIds.has(book.id)}
                      showStatusBadge={isSignedIn}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

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
                  className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-[var(--jtb-accent-hi)] h-9 px-4 text-sm font-semibold transition-colors"
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
