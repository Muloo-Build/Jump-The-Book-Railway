import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/layout";
import { useGenerateScene } from "@/hooks/useGenerateScene";
import { useLibrary } from "@/lib/library";
import { DEMO_BOOKS } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Image as ImageIcon, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Generate() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const bookId = params.get("bookId");
  const chapterStr = params.get("chapter");
  
  const [, setLocation] = useLocation();
  const { userLibrary } = useLibrary();
  const { generateScenesWithImages, progress, isWorking, error } = useGenerateScene();
  
  const [isComplete, setIsComplete] = useState(false);

  const book = userLibrary.find((b) => b.id === bookId) || DEMO_BOOKS.find((b) => b.id === bookId);
  const chapterNumber = parseInt(chapterStr || "1", 10);

  useEffect(() => {
    if (!book) return;

    let mounted = true;
    const run = async () => {
      const result = await generateScenesWithImages({
        bookTitle: book.title,
        author: book.author,
        chapterTitle: `Chapter ${chapterNumber}`,
        chapterNumber,
        visualStyle: book.visualStyle,
        spoilerMode: "spoilerMode" in book ? book.spoilerMode : "no-spoilers"
      });
      if (mounted && result) {
        setIsComplete(true);
      }
    };
    
    run();
    return () => { mounted = false; };
  }, [book, chapterNumber, generateScenesWithImages]);

  if (!book) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-6">
          <p>Book not found.</p>
        </div>
      </Layout>
    );
  }

  const progressPercent = progress && progress.total > 0 
    ? (progress.current / progress.total) * 100 
    : 0;

  return (
    <Layout hideNav>
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
        {/* Ambient background glow */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-primary/30 blur-[100px]" />
        </div>

        <motion.div 
          className="z-10 max-w-md w-full space-y-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-primary animate-pulse" />
            <h1 className="font-serif text-3xl font-bold">Visualizing Chapter {chapterNumber}</h1>
            <p className="text-muted-foreground">{book.title}</p>
          </div>

          <div className="space-y-4">
            <Progress value={progressPercent} className="h-2 bg-muted/50" />
            <div className="flex items-center justify-center gap-3 text-sm font-medium text-primary">
              {isWorking && <Loader2 className="w-4 h-4 animate-spin" />}
              {progress?.message || "Preparing..."}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-sm">
              {error}
            </div>
          )}

          <AnimatePresence>
            {isComplete && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-8 space-y-4"
              >
                <p className="text-lg font-serif mb-6">Scenes are ready.</p>
                <div className="grid grid-cols-1 gap-4">
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg"
                    onClick={() => setLocation(`/experience/${book.id}?chapter=${chapterNumber}`)}
                  >
                    <ImageIcon className="w-5 h-5 mr-3" />
                    Enter Cinematic View
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full h-14 text-lg"
                    onClick={() => setLocation(`/comic/${book.id}?chapter=${chapterNumber}`)}
                  >
                    <BookOpen className="w-5 h-5 mr-3" />
                    Read as Comic
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isComplete && !error && (
            <Button variant="ghost" onClick={() => setLocation(`/book/${book.id}`)} className="mt-12 text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
