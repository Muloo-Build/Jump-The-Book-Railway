import { useParams, Link } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { DEMO_BOOKS, CHAPTERS } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Image as ImageIcon,
  Sparkles,
  Settings2,
  BookOpen,
  Wand2,
  Pencil,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import BookMetadata from "@/components/book-metadata";
import PastePassage from "@/components/paste-passage";
import {
  useOpenLibraryEnrichment,
  clearEnrichmentCache,
} from "@/hooks/useOpenLibraryEnrichment";
import { useToast } from "@/hooks/use-toast";
import { useBookBible } from "@/hooks/useBookBible";
import { useIsSignedIn } from "@/hooks/useApiLibrary";

// User-book IDs from the remote API are UUIDs. Demo books use slugs ("alice").
// Only call the bible endpoint for UUID-shaped IDs to avoid spurious 404s.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { userLibrary, getPosition } = useLibrary();
  const isSignedIn = useIsSignedIn();
  const { toast } = useToast();

  const demoBook = DEMO_BOOKS.find((b) => b.id === id);
  const userBook = userLibrary.find((b) => b.id === id);
  const book = userBook || demoBook;

  // Bibles are keyed by user_books.id (UUID). For uploaded/manual books the
  // URL `id` is already that UUID; for demo-mapped books (slug URL like
  // "alice") we need the remote UUID stored on the library item. Only fetch
  // when signed in and we actually have a UUID to look up.
  const bibleBookId =
    isSignedIn && userBook
      ? UUID_RE.test(id)
        ? id
        : userBook.remoteId ?? null
      : null;
  const bibleQ = useBookBible(bibleBookId);
  const bible = bibleQ.data?.bible ?? null;

  // Pull a cover from Open Library when the book has no built-in image.
  // The hook also drives <BookMetadata>, so they share one cached lookup.
  const needsWebCover = !!book && !book.heroImage;
  const enrichment = useOpenLibraryEnrichment(book?.title, book?.author, {
    enabled: needsWebCover,
  });
  const webCover = needsWebCover ? enrichment.coverUrl : null;

  if (!book) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h2 className="text-2xl font-serif mb-4">Book not found</h2>
          <Link href="/library">
            <Button>Return to Library</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const position = getPosition(book.id);
  const currentChapter = position?.chapter || book.currentChapter || 1;
  
  // For demo books, we have pre-baked chapters
  const demoChapters = CHAPTERS[book.id] || [];
  const currentDemoChapter = demoChapters.find(c => c.chapterNumber === currentChapter);

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Cover Column */}
          <div className="w-full md:w-1/3 max-w-[300px] mx-auto md:mx-0 shrink-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[2/3] w-full rounded-lg shadow-2xl relative overflow-hidden ring-1 ring-border"
              style={{
                background: `linear-gradient(to bottom right, ${book.coverGradient[0]}, ${book.coverGradient[1]})`,
              }}
            >
              {book.heroImage &&
                (book.heroImage.startsWith("http") || book.heroImage.startsWith("/") ? (
                  <img
                    src={book.heroImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <img
                    src={`${import.meta.env.BASE_URL}images/${book.heroImage}.png`}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ))}
              {!book.heroImage && webCover && (
                <img
                  src={webCover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </motion.div>
            {!book.heroImage && (
              <button
                type="button"
                onClick={() => {
                  clearEnrichmentCache(book.title, book.author);
                  toast({
                    title: "Refreshing cover",
                    description: "Pulling the latest match from Open Library.",
                  });
                  setTimeout(() => window.location.reload(), 400);
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh cover
              </button>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-2">
                {book.title}
              </h1>
              <p className="text-xl text-muted-foreground font-medium mb-6">
                by {book.author}
              </p>
              {book.tagline && (
                <p className="text-lg text-primary italic border-l-2 border-primary pl-4 py-1">
                  "{book.tagline}"
                </p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        <MapPin className="w-4 h-4 mr-2" /> Current Position
                      </div>
                      <div className="font-serif text-2xl font-semibold">
                        Chapter {currentChapter}
                      </div>
                      {currentDemoChapter && (
                        <div className="text-sm text-muted-foreground">
                          {currentDemoChapter.title}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Link href={`/position/${book.id}`} className="w-full">
                        <Button variant="outline" className="w-full justify-start">
                          <Settings2 className="w-4 h-4 mr-2" /> Update Position
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <BookMetadata title={book.title} author={book.author} />

            {bibleBookId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {bible ? (
                  <Card className="bg-amber-400/5 border-amber-400/30">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                            <Wand2 className="w-3.5 h-3.5" /> Book Bible
                          </div>
                          <h3 className="font-serif text-xl font-semibold">
                            {bible.series
                              ? `${bible.series}${bible.bookNumber ? ` #${bible.bookNumber}` : ""}`
                              : "Your story profile"}
                          </h3>
                        </div>
                        <Link href={`/setup-book?bookId=${bibleBookId}`}>
                          <Button size="sm" variant="ghost">
                            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                          </Button>
                        </Link>
                      </div>

                      {bible.nonSpoilerSummary && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {bible.nonSpoilerSummary}
                        </p>
                      )}

                      {(bible.genre.length > 0 || bible.tone.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {bible.genre.map((g) => (
                            <Badge key={`g-${g}`} variant="secondary">
                              {g}
                            </Badge>
                          ))}
                          {bible.tone.map((t) => (
                            <Badge
                              key={`t-${t}`}
                              variant="outline"
                              className="border-amber-400/40 text-amber-200"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-xs text-center pt-2 border-t border-border/40">
                        <Stat
                          n={bible.characterProfiles.length}
                          label="characters"
                        />
                        <Stat
                          n={bible.locations.length}
                          label="locations"
                        />
                        <Stat n={bible.factions.length} label="factions" />
                      </div>

                      {bible.avoidNotes && (
                        <div className="text-xs text-muted-foreground border-t border-border/40 pt-3">
                          <span className="font-medium text-foreground">
                            Avoid:
                          </span>{" "}
                          {bible.avoidNotes}
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground/80 pt-1">
                        Every scene we generate uses this context to stay on-tone
                        and spoiler-safe.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  !bibleQ.isLoading && (
                    <Card className="border-dashed border-amber-400/30 bg-amber-400/5">
                      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                            <Wand2 className="w-3.5 h-3.5" /> Book Bible
                          </div>
                          <p className="text-sm">
                            Build a story profile so every scene is grounded in
                            this book's world.
                          </p>
                        </div>
                        <Link href={`/setup-book?bookId=${bibleBookId}`}>
                          <Button>
                            <Sparkles className="w-4 h-4 mr-2" /> Add a bible
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                )}
              </motion.div>
            )}

            <PastePassage bookId={book.id} chapter={currentChapter} />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
              <h3 className="font-serif text-2xl font-semibold">Experience Chapter {currentChapter}</h3>
              <p className="text-sm text-muted-foreground">
                Or generate scenes from the book itself — no passage needed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href={`/generate?bookId=${book.id}&chapter=${currentChapter}`}>
                  <Button size="lg" className="w-full h-16 text-lg group bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
                    <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                    Generate Scenes
                  </Button>
                </Link>

                <Link href={`/experience/${book.id}?chapter=${currentChapter}`}>
                  <Button size="lg" variant="outline" className="w-full h-16 text-lg group">
                    <ImageIcon className="w-5 h-5 mr-3" />
                    Cinematic View
                  </Button>
                </Link>

                <Link href={`/comic/${book.id}?chapter=${currentChapter}`}>
                  <Button size="lg" variant="outline" className="w-full h-16 text-lg group">
                    <BookOpen className="w-5 h-5 mr-3" />
                    Comic View
                  </Button>
                </Link>

                <Link href={`/playback/${book.id}?chapter=${currentChapter}`}>
                  <Button size="lg" variant="outline" className="w-full h-16 text-lg group bg-amber-400/5 border-amber-400/30 text-amber-200 hover:bg-amber-400/10">
                    <PlayCircle className="w-5 h-5 mr-3" />
                    Watch as trailer
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-lg font-semibold text-foreground">
        {n}
      </div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
