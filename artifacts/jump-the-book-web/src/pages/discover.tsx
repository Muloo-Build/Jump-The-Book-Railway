import { useMemo } from "react";
import { Link } from "wouter";
import { Sparkles, Upload as UploadIcon, Wand2, Compass } from "lucide-react";
import Layout from "@/components/layout";
import { DEMO_BOOKS } from "@/data/books";
import { useRemoteSceneLibrary, useRemoteBooks } from "@/hooks/useApiLibrary";
import { useLibrary } from "@/lib/library";
import LibraryBookTile from "@/components/library-book-tile";

interface Category {
  id: string;
  title: string;
  subtitle: string;
  bookIds: string[];
}

// Curated groupings over the demo catalog. As the catalog grows these
// can be extended or replaced with backend-driven recommendations.
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

export default function Discover() {
  const sceneLib = useRemoteSceneLibrary();
  const remoteBooks = useRemoteBooks();
  const { isSignedIn } = useLibrary();

  // "Most explored" — group scene counts by userBookId so we can rank
  // books by how many scenes the user has actually generated. Filter out
  // any userBookIds the user has since deleted so we never render a tile
  // that links to a 404.
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

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-10 md:py-12 space-y-10 md:space-y-12">
        {/* Hero */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[var(--jtb-accent-hi)]/90 font-medium">
            <Compass className="w-3.5 h-3.5" />
            Discover
          </div>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight">
            Find your <span className="italic text-[var(--jtb-accent-hi)]">next</span> scene.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            Browse our curated catalogue, jump into a public-domain classic, or
            bring any book of your own — Kindle, hardcover, audiobook, anything.
          </p>
        </section>

        {/* Bring your own */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/setup-book"
            className="group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-start gap-4 hover:border-primary/60 transition-colors"
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
            className="group rounded-2xl border border-border/50 bg-card/40 p-6 flex items-start gap-4 hover:border-border transition-colors"
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

        {/* Most explored — only meaningful when signed in and there are scenes */}
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

        {/* Curated categories */}
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {books.map((book, i) => (
                  // Reuse the same tile the Library uses so the cover lookup
                  // (heroImage > persisted coverUrl > Open Library hook) and
                  // the cached image cycle behave identically here.
                  <LibraryBookTile key={book.id} book={book} index={i} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Footer CTA */}
        <section className="rounded-2xl border border-border/50 bg-card/30 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
