import { useState, useEffect, useMemo } from "react";
import { useParams, useSearch, Link } from "wouter";
import { useLibrary } from "@/lib/library";
import { useGenerateScene, GeneratedScene } from "@/hooks/useGenerateScene";
import { useRemoteBooks, useRemoteBookScenes } from "@/hooks/useApiLibrary";
import { DEMO_BOOKS, CHAPTERS, SCENE_IMAGES } from "@/data/books";
import { ChevronLeft, ChevronRight, PlayCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Experience() {
  const { id } = useParams<{ id: string }>();
  const searchString = useSearch();
  const chapterNumber = parseInt(new URLSearchParams(searchString).get("chapter") || "1", 10);
  
  const { userLibrary, isSignedIn } = useLibrary();
  const { readCachedScenes } = useGenerateScene();
  const remoteBooks = useRemoteBooks();

  // Map URL id → backend user_books UUID for signed-in users so we can
  // hydrate previously saved scenes from the server.
  const remoteBookId = useMemo(() => {
    if (!isSignedIn || !id) return null;
    const list = remoteBooks.data ?? [];
    const match =
      list.find((b) => b.demoBookId === id) ?? list.find((b) => b.id === id);
    return match?.id ?? null;
  }, [isSignedIn, id, remoteBooks.data]);
  const remoteScenesQuery = useRemoteBookScenes(remoteBookId);

  const [scenes, setScenes] = useState<GeneratedScene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const book = userLibrary.find((b) => b.id === id) || DEMO_BOOKS.find((b) => b.id === id);

  // Keyboard navigation — left/right arrows step scenes, escape exits the
  // cinematic view. Without this, keyboard users were forced to mouse to the
  // tiny floating chevrons every time.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scenes.length]);

  useEffect(() => {
    if (!book) return;

    // 1) Prefer server-saved scenes for the current chapter (signed-in only).
    const remote = (remoteScenesQuery.data ?? []).filter(
      (s) => s.chapterNumber === chapterNumber,
    );
    if (remote.length > 0) {
      const mapped: GeneratedScene[] = remote
        .slice()
        .sort((a, b) => a.sceneIndex - b.sceneIndex)
        .map((s) => ({
          id: s.id,
          chapterId: `${id}-${s.chapterNumber}`,
          title: s.title,
          summary: s.summary ?? "",
          narration: s.narration ?? "",
          location: s.location ?? "",
          mood: s.mood ?? "",
          characters: s.characters ?? [],
          gradientColors: (s.gradientColors ?? ["#1a1525", "#453560"]) as string[],
          imagePrompt: s.imagePrompt ?? "",
          imageUrl: s.imageUrl ?? null,
        }));
      setScenes(mapped);
      return;
    }

    // 2) Browser cache from a recent generation.
    const cached = readCachedScenes({
      bookTitle: book.title,
      author: book.author,
      chapterTitle: `Chapter ${chapterNumber}`,
      chapterNumber,
      visualStyle: book.visualStyle,
      spoilerMode: "spoilerMode" in book ? book.spoilerMode : "no-spoilers",
    });
    if (cached && cached.length > 0) {
      setScenes(cached);
      return;
    }

    // 3) Demo baked scenes.
    if (book.sourceType === "demo") {
      const demoCh = CHAPTERS[book.id]?.find(c => c.chapterNumber === chapterNumber);
      if (demoCh) {
        setScenes(demoCh.scenes.map(s => ({
          ...s,
          imageUrl: SCENE_IMAGES[s.id] || null,
        })));
        return;
      }
    }

    setScenes([]);
  }, [book, id, chapterNumber, readCachedScenes, remoteScenesQuery.data]);

  // Clamp currentIndex whenever the scenes array changes (e.g. chapter
  // switch or remote hydration shrinks the list). Prevents undefined
  // currentScene access below.
  useEffect(() => {
    if (scenes.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }
    if (currentIndex >= scenes.length) setCurrentIndex(scenes.length - 1);
  }, [scenes.length, currentIndex]);

  const currentScene = scenes[currentIndex];

  if (!book || scenes.length === 0 || !currentScene) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-black text-white p-6">
        <p className="text-xl font-serif mb-4">No scenes found for this chapter.</p>
        <Link href={`/generate?bookId=${id}&chapter=${chapterNumber}`}>
          <Button variant="outline">Generate Scenes First</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col selection:bg-primary/30">
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="font-serif text-sm opacity-70 tracking-widest uppercase pointer-events-auto">
          {book.title} — Chapter {chapterNumber}
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          <Link href={`/playback/${book.id}?chapter=${chapterNumber}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-1.5 hidden sm:inline-flex"
              title="Watch as trailer"
            >
              <PlayCircle className="w-4 h-4" />
              Watch as trailer
            </Button>
          </Link>
          <Link href={`/book/${book.id}`}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            {currentScene.imageUrl ? (
              <img 
                src={currentScene.imageUrl} 
                alt={currentScene.title}
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div 
                className="w-full h-full opacity-40"
                style={{ background: `linear-gradient(to bottom right, ${currentScene.gradientColors[0]}, ${currentScene.gradientColors[1]})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col items-center justify-end z-20 pointer-events-none">
          <motion.div 
            key={`text-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="max-w-4xl w-full text-center space-y-6 pointer-events-auto"
          >
            <p className="font-serif text-2xl md:text-4xl lg:text-5xl leading-snug font-medium text-white/90 drop-shadow-xl">
              {currentScene.narration}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-sans uppercase tracking-widest text-white/50">
              <span>{currentScene.location}</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>{currentScene.mood}</span>
            </div>
          </motion.div>
        </div>

        {/* Navigation Controls */}
        <div className="absolute inset-0 flex justify-between items-center z-30 pointer-events-none px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous scene"
            className="h-16 w-16 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-md text-white pointer-events-auto border border-white/10"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next scene"
            className="h-16 w-16 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-md text-white pointer-events-auto border border-white/10"
            disabled={currentIndex === scenes.length - 1}
            onClick={() =>
              setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1))
            }
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </div>
      </div>
      
      {/* Progress Indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-40">
        {scenes.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? "w-8 bg-white" : "w-2 bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
