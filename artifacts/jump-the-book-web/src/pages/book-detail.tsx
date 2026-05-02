import { useParams, Link } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { DEMO_BOOKS, CHAPTERS } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Image as ImageIcon, Sparkles, Settings2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import BookMetadata from "@/components/book-metadata";
import PastePassage from "@/components/paste-passage";
import { useOpenLibraryEnrichment } from "@/hooks/useOpenLibraryEnrichment";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { userLibrary, getPosition } = useLibrary();

  const demoBook = DEMO_BOOKS.find((b) => b.id === id);
  const userBook = userLibrary.find((b) => b.id === id);
  const book = userBook || demoBook;

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
                  <Button size="lg" variant="outline" className="w-full h-16 text-lg group sm:col-span-2">
                    <BookOpen className="w-5 h-5 mr-3" />
                    Comic View
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
