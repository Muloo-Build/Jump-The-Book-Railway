import { useState, useEffect } from "react";
import { useParams, useSearch, Link } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { useGenerateScene, GeneratedScene } from "@/hooks/useGenerateScene";
import { DEMO_BOOKS, CHAPTERS, SCENE_IMAGES } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Comic() {
  const { id } = useParams<{ id: string }>();
  const searchString = useSearch();
  const chapterNumber = parseInt(new URLSearchParams(searchString).get("chapter") || "1", 10);
  
  const { userLibrary } = useLibrary();
  const { readCachedScenes } = useGenerateScene();
  
  const [scenes, setScenes] = useState<GeneratedScene[]>([]);

  const book = userLibrary.find((b) => b.id === id) || DEMO_BOOKS.find((b) => b.id === id);

  useEffect(() => {
    if (!book) return;
    
    const cached = readCachedScenes({
      bookTitle: book.title,
      author: book.author,
      chapterTitle: `Chapter ${chapterNumber}`,
      chapterNumber,
      visualStyle: book.visualStyle,
      spoilerMode: "spoilerMode" in book ? book.spoilerMode : "no-spoilers"
    });
    
    if (cached && cached.length > 0) {
      setScenes(cached);
    } else if (book.sourceType === "demo") {
      const demoCh = CHAPTERS[book.id]?.find(c => c.chapterNumber === chapterNumber);
      if (demoCh) {
        setScenes(demoCh.scenes.map(s => ({
          ...s,
          imageUrl: SCENE_IMAGES[s.id] || null
        })));
      }
    }
  }, [book, chapterNumber, readCachedScenes]);

  if (!book) return null;

  return (
    <Layout hideNav>
      <div className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center px-4 max-w-4xl">
            <Link href={`/book/${book.id}`}>
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <div className="flex-1 font-serif text-lg font-medium truncate">
              {book.title} — Chapter {chapterNumber}
            </div>
          </div>
        </header>

        <main className="container max-w-3xl mx-auto px-4 py-12 space-y-16">
          {scenes.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <p className="text-xl text-muted-foreground font-serif">Scenes haven't been generated yet.</p>
              <Link href={`/generate?bookId=${book.id}&chapter=${chapterNumber}`}>
                <Button size="lg"><Sparkles className="w-4 h-4 mr-2" /> Generate Now</Button>
              </Link>
            </div>
          ) : (
            scenes.map((scene, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <Card className="overflow-hidden border-border/50 bg-card/30 shadow-xl ring-1 ring-border/50">
                  <div className="relative aspect-video w-full bg-muted">
                    {scene.imageUrl ? (
                      <img 
                        src={scene.imageUrl} 
                        alt={scene.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div 
                        className="w-full h-full opacity-50"
                        style={{ background: `linear-gradient(to bottom right, ${scene.gradientColors[0]}, ${scene.gradientColors[1]})` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                      <h3 className="font-serif text-2xl text-white font-semibold drop-shadow-md mb-2">
                        {scene.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/70 font-medium drop-shadow">
                        <span>{scene.location}</span>
                        <span>•</span>
                        <span>{scene.mood}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6 md:p-8 bg-card">
                    <p className="font-serif text-xl md:text-2xl leading-relaxed text-card-foreground">
                      {scene.narration}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
          
          {scenes.length > 0 && (
            <div className="py-12 text-center border-t border-border/40">
              <h3 className="font-serif text-2xl mb-6">End of Chapter</h3>
              <div className="flex justify-center gap-4">
                <Link href={`/book/${book.id}`}>
                  <Button variant="outline">Return to Book</Button>
                </Link>
                <Link href={`/position/${book.id}`}>
                  <Button>Update Position</Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
