import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/layout";
import {
  useGenerateScene,
  type GeneratedScene,
} from "@/hooks/useGenerateScene";
import { useLibrary } from "@/lib/library";
import { useSaveRemoteScene } from "@/hooks/useApiLibrary";
import { DEMO_BOOKS } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Image as ImageIcon, BookOpen, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  readPendingPassage,
  clearPendingPassage,
  type PendingPassage,
} from "@/components/paste-passage";
import { apiFetch } from "@/lib/queryClient";
import type { SavedBible } from "@/hooks/useBookBible";

interface PendingReadingContext {
  bookId: string;
  chapter: number;
  excerpt?: string;
  whatJustHappened?: string;
  savedAt: number;
}

const READING_CONTEXT_KEY = "@jtb_pending_reading_context";

function readPendingReadingContext(): PendingReadingContext | null {
  try {
    const raw = sessionStorage.getItem(READING_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingReadingContext;
  } catch {
    return null;
  }
}
function clearPendingReadingContext() {
  try {
    sessionStorage.removeItem(READING_CONTEXT_KEY);
  } catch {}
}

export default function Generate() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const bookId = params.get("bookId");
  const chapterStr = params.get("chapter");

  const [, setLocation] = useLocation();
  const { userLibrary, isSignedIn, resolveRemoteBookId, settings } = useLibrary();
  const { generateScenesWithImages, progress, isWorking, error } =
    useGenerateScene();
  const saveScene = useSaveRemoteScene();

  const [isComplete, setIsComplete] = useState(false);

  const book =
    userLibrary.find((b) => b.id === bookId) ||
    DEMO_BOOKS.find((b) => b.id === bookId);
  const chapterNumber = parseInt(chapterStr || "1", 10);

  // Read the handoff exactly once via lazy state init, then clear sessionStorage
  // inside an effect so an in-flight render that throws can't lose the data.
  const [pendingPassage] = useState<PendingPassage | null>(() => {
    const pending = readPendingPassage();
    if (
      pending &&
      pending.bookId === bookId &&
      pending.chapter === chapterNumber &&
      Date.now() - pending.savedAt < 5 * 60_000
    ) {
      return pending;
    }
    return null;
  });

  const [pendingReadingContext] = useState<PendingReadingContext | null>(() => {
    const ctx = readPendingReadingContext();
    if (
      ctx &&
      ctx.bookId === bookId &&
      ctx.chapter === chapterNumber &&
      Date.now() - ctx.savedAt < 5 * 60_000
    ) {
      return ctx;
    }
    return null;
  });

  useEffect(() => {
    if (pendingPassage) clearPendingPassage();
  }, [pendingPassage]);

  useEffect(() => {
    if (pendingReadingContext) clearPendingReadingContext();
  }, [pendingReadingContext]);

  useEffect(() => {
    if (!book) return;

    // Per-run state — captured in closure so callbacks from a previous run
    // (e.g. user navigated to a different book mid-generation) cannot leak
    // into the current run's persistence target.
    let active = true;
    let runRemoteBookId: string | null = null;
    let runSceneCacheKey: string | null = null;
    const runScenes: GeneratedScene[] = [];

    const persistScene = (i: number) => {
      if (!active) return;
      if (!isSignedIn || !runRemoteBookId) return;
      const scene = runScenes[i];
      if (!scene) return;
      saveScene.mutate({
        userBookId: runRemoteBookId,
        chapterNumber,
        sceneIndex: i,
        title: scene.title,
        summary: scene.summary,
        narration: scene.narration,
        location: scene.location,
        mood: scene.mood,
        characters: scene.characters,
        gradientColors: scene.gradientColors,
        imagePrompt: scene.imagePrompt,
        imageUrl: scene.imageUrl ?? null,
        visualStyle: book.visualStyle,
        sceneCacheKey: runSceneCacheKey,
        imageCacheKey: scene.imageCacheKey ?? null,
      });
    };

    const run = async () => {
      let bibleId: string | undefined;
      if (isSignedIn) {
        try {
          const resolved = await resolveRemoteBookId({
            id: book.id,
            title: book.title,
            author: book.author,
            format: book.format,
            visualStyle: book.visualStyle,
            spoilerMode:
              "spoilerMode" in book ? book.spoilerMode : settings.spoilerMode,
            coverGradient: book.coverGradient,
            tagline: "tagline" in book ? book.tagline ?? undefined : undefined,
            heroImage:
              "heroImage" in book ? book.heroImage ?? undefined : undefined,
            sourceType:
              ("sourceType" in book && book.sourceType) || "demo",
          });
          if (!active) return;
          runRemoteBookId = resolved;

          // Auto-load any saved bible so every scene gen on this book is
          // grounded in the reader's confirmed story profile.
          if (resolved) {
            try {
              const r = await apiFetch<{ bible: SavedBible | null }>(
                `/me/books/${encodeURIComponent(resolved)}/bible`,
              );
              if (r.bible) bibleId = r.bible.id;
            } catch (err) {
              console.warn("Failed to load book bible", err);
            }
          }
        } catch (err) {
          console.warn("Failed to resolve remote book id", err);
        }
      }

      // Reading-context handoff from the Smart Setup wizard.
      const excerpt = pendingPassage?.excerpt ?? pendingReadingContext?.excerpt;
      const whatJustHappened = pendingReadingContext?.whatJustHappened;

      const result = await generateScenesWithImages(
        {
          bookTitle: book.title,
          author: book.author,
          chapterTitle: `Chapter ${chapterNumber}`,
          chapterNumber,
          visualStyle: book.visualStyle,
          spoilerMode:
            "spoilerMode" in book ? book.spoilerMode : "no-spoilers",
          excerpt,
          sceneCount: pendingPassage?.sceneCount,
          bookBibleId: bibleId,
          whatJustHappened,
        },
        {
          onScenesReady: (scenes, cacheKey) => {
            if (!active) return;
            runScenes.length = 0;
            scenes.forEach((s) => runScenes.push(s));
            runSceneCacheKey = cacheKey;
            scenes.forEach((_, i) => persistScene(i));
          },
          onImageReady: (sceneIndex, imageUrl) => {
            if (!active) return;
            const cur = runScenes[sceneIndex];
            if (cur) {
              runScenes[sceneIndex] = { ...cur, imageUrl };
            }
            persistScene(sceneIndex);
          },
        },
      );
      if (active && result) {
        setIsComplete(true);
      }
    };

    run();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, chapterNumber, isSignedIn]);

  if (!book) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-6">
          <p>Book not found.</p>
        </div>
      </Layout>
    );
  }

  const progressPercent =
    progress && progress.total > 0
      ? (progress.current / progress.total) * 100
      : 0;

  return (
    <Layout hideNav>
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
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
            <h1 className="font-serif text-3xl font-bold">
              {pendingPassage
                ? "Visualizing your passage"
                : `Visualizing Chapter ${chapterNumber}`}
            </h1>
            <p className="text-muted-foreground">{book.title}</p>
            {pendingPassage && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs px-3 py-1">
                <Wand2 className="w-3 h-3" />
                From your pasted passage · {pendingPassage.sceneCount}{" "}
                scene{pendingPassage.sceneCount === 1 ? "" : "s"}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Progress value={progressPercent} className="h-2 bg-muted/50" />
            <div className="flex items-center justify-center gap-3 text-sm font-medium text-primary">
              {isWorking && <Loader2 className="w-4 h-4 animate-spin" />}
              {progress?.message || "Preparing..."}
            </div>
          </div>

          {isSignedIn && (
            <p className="text-xs text-muted-foreground">
              Scenes are being saved to your library as they generate.
            </p>
          )}

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
                    onClick={() =>
                      setLocation(
                        `/experience/${book.id}?chapter=${chapterNumber}`,
                      )
                    }
                  >
                    <ImageIcon className="w-5 h-5 mr-3" />
                    Enter Cinematic View
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-14 text-lg"
                    onClick={() =>
                      setLocation(
                        `/comic/${book.id}?chapter=${chapterNumber}`,
                      )
                    }
                  >
                    <BookOpen className="w-5 h-5 mr-3" />
                    Read as Comic
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isComplete && !error && (
            <Button
              variant="ghost"
              onClick={() => setLocation(`/book/${book.id}`)}
              className="mt-12 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
