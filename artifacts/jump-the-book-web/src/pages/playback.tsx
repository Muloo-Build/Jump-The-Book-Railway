import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearch, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/library";
import {
  useRemoteBooks,
  useRemoteBookScenes,
  type RemoteScene,
} from "@/hooks/useApiLibrary";
import { DEMO_BOOKS, CHAPTERS, SCENE_IMAGES } from "@/data/books";

const SLIDE_MS_NO_AUDIO = 7000;

interface PlayableScene {
  id: string;
  title: string;
  narration: string;
  imageUrl: string | null;
  gradient: string[];
  location: string;
  mood: string;
}

function fromRemote(s: RemoteScene): PlayableScene {
  return {
    id: s.id,
    title: s.title,
    narration: s.narration ?? "",
    imageUrl: s.imageUrl ?? null,
    gradient: (s.gradientColors ?? ["#1a1525", "#453560"]) as string[],
    location: s.location ?? "",
    mood: s.mood ?? "",
  };
}

export default function Playback() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const chapterNumber = parseInt(
    new URLSearchParams(search).get("chapter") || "1",
    10,
  );
  const [, setLocation] = useLocation();

  const { userLibrary, isSignedIn } = useLibrary();
  const remoteBooks = useRemoteBooks();
  const book =
    userLibrary.find((b) => b.id === id) ||
    DEMO_BOOKS.find((b) => b.id === id);

  // Resolve user_book uuid for signed-in users so we can pull saved scenes.
  const remoteBookId = useMemo(() => {
    if (!isSignedIn || !id) return null;
    const list = remoteBooks.data ?? [];
    return (
      list.find((b) => b.demoBookId === id)?.id ??
      list.find((b) => b.id === id)?.id ??
      null
    );
  }, [isSignedIn, id, remoteBooks.data]);

  const remoteScenesQ = useRemoteBookScenes(remoteBookId);

  // Build the playable scene list for this chapter.
  const scenes: PlayableScene[] = useMemo(() => {
    const remote = (remoteScenesQ.data ?? [])
      .filter((s) => s.chapterNumber === chapterNumber)
      .sort((a, b) => a.sceneIndex - b.sceneIndex)
      .map(fromRemote);
    if (remote.length > 0) return remote;

    if (book?.sourceType === "demo") {
      const ch = CHAPTERS[book.id]?.find(
        (c) => c.chapterNumber === chapterNumber,
      );
      if (ch) {
        return ch.scenes.map((s) => ({
          id: s.id,
          title: s.title,
          narration: s.narration ?? "",
          imageUrl: SCENE_IMAGES[s.id] ?? null,
          gradient: s.gradientColors ?? ["#1a1525", "#453560"],
          location: s.location ?? "",
          mood: s.mood ?? "",
        }));
      }
    }
    return [];
  }, [remoteScenesQ.data, chapterNumber, book]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ttsAvailable] = useState(
    typeof window !== "undefined" && "speechSynthesis" in window,
  );

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const current = scenes[index];

  // Stop on unmount
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Drive the show: TTS narration if available + un-muted, else silent timer.
  useEffect(() => {
    if (!current) return;
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (!playing) return;

    const advance = () => {
      setIndex((i) => {
        if (i < scenes.length - 1) return i + 1;
        // We reached the end — stop the show so the effect doesn't keep
        // re-scheduling silent timeouts or replays.
        setPlaying(false);
        return i;
      });
    };

    const useTts = ttsAvailable && !muted && current.narration.trim();
    if (useTts) {
      const u = new SpeechSynthesisUtterance(current.narration);
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.lang = navigator.language || "en-US";
      u.onend = () => {
        advanceTimerRef.current = window.setTimeout(advance, 600);
      };
      u.onerror = () => {
        advanceTimerRef.current = window.setTimeout(advance, SLIDE_MS_NO_AUDIO);
      };
      utteranceRef.current = u;
      try {
        window.speechSynthesis.speak(u);
      } catch {
        advanceTimerRef.current = window.setTimeout(advance, SLIDE_MS_NO_AUDIO);
      }
    } else {
      advanceTimerRef.current = window.setTimeout(advance, SLIDE_MS_NO_AUDIO);
    }

    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [index, playing, muted, ttsAvailable, current, scenes.length]);

  // Loading + empty states
  if (!book) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <p>Book not found.</p>
          <Link href="/library">
            <Button className="mt-4">Back to library</Button>
          </Link>
        </div>
      </Layout>
    );
  }
  if (remoteScenesQ.isLoading && scenes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (scenes.length === 0) {
    return (
      <Layout>
        <div className="container py-24 text-center space-y-4">
          <p className="font-serif text-2xl">
            No scenes for Chapter {chapterNumber} yet.
          </p>
          <Link href={`/generate?bookId=${id}&chapter=${chapterNumber}`}>
            <Button>Generate scenes first</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const goPrev = () => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  };
  const goNext = () => {
    setIndex((i) => (i < scenes.length - 1 ? i + 1 : i));
  };
  const togglePlay = () => setPlaying((p) => !p);
  const toggleMute = () => setMuted((m) => !m);
  const isLast = index === scenes.length - 1;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="font-serif text-xs md:text-sm opacity-80 tracking-widest uppercase pointer-events-auto">
          {book.title} · Chapter {chapterNumber} · Trailer
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/book/${book.id}`)}
          className="text-white/70 hover:text-white pointer-events-auto hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Exit
        </Button>
      </div>

      {/* Stage */}
      <div className="flex-1 relative flex items-center justify-center w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id ?? index}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${current?.gradient[0] ?? "#000"}, ${current?.gradient[current.gradient.length - 1] ?? "#000"})`,
            }}
          >
            {current?.imageUrl && (
              <motion.img
                src={current.imageUrl}
                alt={current.title}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ scale: 1.0 }}
                animate={{ scale: 1.08 }}
                transition={{ duration: 8, ease: "linear" }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/40" />
          </motion.div>
        </AnimatePresence>

        {/* Caption */}
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={`caption-${current.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 max-w-3xl px-6 md:px-12 pb-32 md:pb-40 mt-auto self-end w-full"
            >
              <h2 className="font-serif text-3xl md:text-5xl font-bold mb-3 leading-tight drop-shadow-lg">
                {current.title}
              </h2>
              {current.narration && (
                <p className="text-base md:text-lg text-white/90 leading-relaxed font-serif italic max-w-2xl drop-shadow">
                  {current.narration}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black/95 to-transparent">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center">
            {scenes.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-amber-300"
                    : i < index
                      ? "w-4 bg-white/60"
                      : "w-4 bg-white/20"
                }`}
                aria-label={`Scene ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              disabled={index === 0}
              className="text-white hover:bg-white/10"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              onClick={togglePlay}
              className="bg-amber-400 text-black hover:bg-amber-300 w-12 h-12 rounded-full"
            >
              {playing ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              disabled={isLast}
              className="text-white hover:bg-white/10"
            >
              <SkipForward className="w-5 h-5" />
            </Button>

            {ttsAvailable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/10 ml-2"
                title={muted ? "Unmute narration" : "Mute narration"}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-white/50">
            Scene {index + 1} of {scenes.length}
            {!ttsAvailable && " · narration unavailable in this browser"}
          </p>
        </div>
      </div>
    </div>
  );
}
