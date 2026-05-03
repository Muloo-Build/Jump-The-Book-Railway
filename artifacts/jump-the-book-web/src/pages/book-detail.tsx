import { useParams, Link, useLocation } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { DEMO_BOOKS, CHAPTERS } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import BookMetadata from "@/components/book-metadata";
import PastePassage from "@/components/paste-passage";
import {
  useOpenLibraryEnrichment,
  clearEnrichmentCache,
} from "@/hooks/useOpenLibraryEnrichment";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useBookBible } from "@/hooks/useBookBible";
import {
  useIsSignedIn,
  useRemoteBooks,
  useRemoteBookScenes,
  useDeleteRemoteBook,
  useDeleteRemoteScene,
  useAddRemoteBook,
  useSaveRemoteScene,
  type RemoteScene,
  type RemoteBook,
} from "@/hooks/useApiLibrary";
import EditBookDialog from "@/components/edit-book-dialog";
import BookCompanion from "@/components/book-companion";
import { useState } from "react";

// User-book IDs from the remote API are UUIDs. Demo books use slugs ("alice").
// Only call the bible endpoint for UUID-shaped IDs to avoid spurious 404s.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { userLibrary, getPosition } = useLibrary();
  const isSignedIn = useIsSignedIn();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteBookOpen, setDeleteBookOpen] = useState(false);
  const [deleteSceneId, setDeleteSceneId] = useState<string | null>(null);

  const remoteBooks = useRemoteBooks();
  const deleteBook = useDeleteRemoteBook();
  const deleteScene = useDeleteRemoteScene();
  const addBook = useAddRemoteBook();
  const saveScene = useSaveRemoteScene();

  const demoBook = DEMO_BOOKS.find((b) => b.id === id);
  const userBook = userLibrary.find((b) => b.id === id);
  const book = userBook || demoBook;

  const remoteBookId =
    userBook && (UUID_RE.test(id) ? id : userBook.remoteId ?? null);
  const remoteBook =
    remoteBookId && remoteBooks.data
      ? remoteBooks.data.find((b) => b.id === remoteBookId)
      : undefined;

  const bibleBookId =
    isSignedIn && userBook
      ? UUID_RE.test(id)
        ? id
        : userBook.remoteId ?? null
      : null;
  const bibleQ = useBookBible(bibleBookId);
  const bible = bibleQ.data?.bible ?? null;

  // Fetch scenes for this book (only when signed in and we have a remote id)
  const scenesQ = useRemoteBookScenes(remoteBookId ?? null);
  const scenes = scenesQ.data ?? [];

  const persistedCover = book?.coverUrl ?? null;
  const needsWebCover = !!book && !book.heroImage && !persistedCover;
  const enrichment = useOpenLibraryEnrichment(book?.title, book?.author, {
    enabled: needsWebCover,
  });
  const webCover = needsWebCover ? enrichment.coverUrl : null;

  // Don't flash "Book not found" while the books list is still loading —
  // most commonly seen right after Add to Library navigates here before the
  // ["me","books"] cache has populated.
  const booksStillLoading =
    isSignedIn && (remoteBooks.isLoading || remoteBooks.isFetching) && !book;
  if (booksStillLoading) {
    return (
      <Layout>
        <div className="container py-24 text-center text-sm text-muted-foreground inline-flex items-center gap-2 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading book…
        </div>
      </Layout>
    );
  }

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
  
  const demoChapters = CHAPTERS[book.id] || [];
  const currentDemoChapter = demoChapters.find(c => c.chapterNumber === currentChapter);

  const UNDO_WINDOW_MS = 8000;

  const restoreBook = async (
    snapshot: RemoteBook,
    sceneSnapshots: RemoteScene[],
  ) => {
    try {
      const recreated = await addBook.mutateAsync({
        title: snapshot.title,
        author: snapshot.author,
        format: snapshot.format,
        source: snapshot.source,
        demoBookId: snapshot.demoBookId,
        coverGradient: snapshot.coverGradient,
        visualStyle: snapshot.visualStyle,
        spoilerMode: snapshot.spoilerMode,
        currentChapter: snapshot.currentChapter,
        currentPage: snapshot.currentPage,
        currentAudioTimestamp: snapshot.currentAudioTimestamp,
        progress: snapshot.progress,
        userNote: snapshot.userNote,
        tagline: snapshot.tagline,
        heroImage: snapshot.heroImage,
        coverUrl: snapshot.coverUrl,
        totalChapters: snapshot.totalChapters,
      });
      let failed = 0;
      if (sceneSnapshots.length > 0) {
        const results = await Promise.all(
          sceneSnapshots.map((s) =>
            saveScene
              .mutateAsync({
                userBookId: recreated.id,
                chapterNumber: s.chapterNumber,
                sceneIndex: s.sceneIndex,
                title: s.title,
                summary: s.summary ?? undefined,
                narration: s.narration ?? undefined,
                location: s.location ?? undefined,
                mood: s.mood ?? undefined,
                characters: s.characters,
                gradientColors: s.gradientColors,
                imagePrompt: s.imagePrompt ?? undefined,
                imageUrl: s.imageUrl,
                visualStyle: s.visualStyle ?? undefined,
              })
              .then(() => true as const)
              .catch(() => false as const),
          ),
        );
        failed = results.filter((ok) => !ok).length;
      }
      if (failed > 0) {
        toast({
          title: "Book partially restored",
          description: `"${snapshot.title}" is back, but ${failed} of ${sceneSnapshots.length} saved scenes couldn't be restored.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Book restored",
          description: `"${snapshot.title}" is back on your shelf.`,
        });
      }
      navigate(`/book/${recreated.id}`);
    } catch (err) {
      toast({
        title: "Couldn't restore book",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const restoreScene = async (snapshot: RemoteScene) => {
    try {
      await saveScene.mutateAsync({
        userBookId: snapshot.userBookId,
        chapterNumber: snapshot.chapterNumber,
        sceneIndex: snapshot.sceneIndex,
        title: snapshot.title,
        summary: snapshot.summary ?? undefined,
        narration: snapshot.narration ?? undefined,
        location: snapshot.location ?? undefined,
        mood: snapshot.mood ?? undefined,
        characters: snapshot.characters,
        gradientColors: snapshot.gradientColors,
        imagePrompt: snapshot.imagePrompt ?? undefined,
        imageUrl: snapshot.imageUrl,
        visualStyle: snapshot.visualStyle ?? undefined,
      });
      toast({ title: "Scene restored" });
    } catch (err) {
      toast({
        title: "Couldn't restore scene",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBook = async () => {
    if (!remoteBook) return;
    // Need an authoritative scene list so Undo can rebuild the full book.
    let authoritativeScenes: RemoteScene[] = scenes;
    if (!scenesQ.isSuccess) {
      const r = await scenesQ.refetch();
      if (r.isError || !r.data) {
        toast({
          title: "Couldn't delete book",
          description:
            "We couldn't load the saved scenes for this book. Please try again.",
          variant: "destructive",
        });
        setDeleteBookOpen(false);
        return;
      }
      authoritativeScenes = r.data;
    }

    // Snapshots live only in this closure and are nulled after the undo window.
    let bookSnapshot: RemoteBook | null = { ...remoteBook };
    let sceneSnapshots: RemoteScene[] | null = authoritativeScenes.map((s) => ({
      ...s,
    }));

    try {
      // Delete scenes first so nothing is left orphaned
      if (sceneSnapshots.length > 0) {
        await Promise.all(
          sceneSnapshots.map((s) =>
            deleteScene.mutateAsync(s.id).catch(() => {}),
          ),
        );
      }
      await deleteBook.mutateAsync(remoteBook.id);
      const t = toast({
        title: "Book deleted",
        description: `"${bookSnapshot.title}" has been removed from your shelf.`,
        duration: UNDO_WINDOW_MS,
        action: (
          <ToastAction
            altText="Undo book deletion"
            onClick={() => {
              const bs = bookSnapshot;
              const ss = sceneSnapshots;
              bookSnapshot = null;
              sceneSnapshots = null;
              t.dismiss();
              if (bs) restoreBook(bs, ss ?? []);
            }}
          >
            Undo
          </ToastAction>
        ),
      });
      // Drop the snapshot once the undo window expires.
      window.setTimeout(() => {
        bookSnapshot = null;
        sceneSnapshots = null;
      }, UNDO_WINDOW_MS);
      navigate("/library");
    } catch (err) {
      bookSnapshot = null;
      sceneSnapshots = null;
      toast({
        title: "Couldn't delete book",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
    setDeleteBookOpen(false);
  };

  const handleDeleteScene = async () => {
    if (!deleteSceneId) return;
    const found = scenes.find((s) => s.id === deleteSceneId);
    // Snapshot lives only in this closure and is nulled after the undo window.
    let sceneSnapshot: RemoteScene | null = found ? { ...found } : null;
    try {
      await deleteScene.mutateAsync(deleteSceneId);
      if (sceneSnapshot) {
        const t = toast({
          title: "Scene removed",
          duration: UNDO_WINDOW_MS,
          action: (
            <ToastAction
              altText="Undo scene deletion"
              onClick={() => {
                const snap = sceneSnapshot;
                sceneSnapshot = null;
                t.dismiss();
                if (snap) restoreScene(snap);
              }}
            >
              Undo
            </ToastAction>
          ),
        });
        window.setTimeout(() => {
          sceneSnapshot = null;
        }, UNDO_WINDOW_MS);
      } else {
        toast({ title: "Scene removed" });
      }
    } catch (err) {
      sceneSnapshot = null;
      toast({
        title: "Couldn't delete scene",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
    setDeleteSceneId(null);
  };

  const sceneToDelete = scenes.find((s) => s.id === deleteSceneId);

  // Group scenes by chapter for display
  const scenesByChapter = new Map<number, RemoteScene[]>();
  for (const s of scenes) {
    const arr = scenesByChapter.get(s.chapterNumber) ?? [];
    arr.push(s);
    scenesByChapter.set(s.chapterNumber, arr);
  }
  const chapterEntries = [...scenesByChapter.entries()].sort((a, b) => b[0] - a[0]);

  const isDeletingBook = deleteBook.isPending || deleteScene.isPending;
  // Block the destructive action only while the scenes query is actively in
  // flight. On error we still allow the user to confirm — handleDeleteBook
  // will attempt an explicit refetch and surface a real error if needed.
  const scenesLoading =
    isSignedIn &&
    !!remoteBookId &&
    (scenesQ.isLoading || scenesQ.isFetching) &&
    !scenesQ.isSuccess;

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
              {!book.heroImage && persistedCover && (
                <img
                  src={persistedCover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
              {!book.heroImage && !persistedCover && webCover && (
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

            {isSignedIn && remoteBook && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteBookOpen(true)}
                className="mt-4 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete book
              </Button>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
                  {book.title}
                </h1>
                {isSignedIn && remoteBook && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="shrink-0 mt-1 text-muted-foreground hover:text-[var(--jtb-accent-hi)]"
                    title="Edit book details"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>
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
                  <Card className="bg-primary/5 border-primary/30">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 text-[var(--jtb-accent-hi)] text-xs font-semibold uppercase tracking-wider">
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
                              className="border-primary/40 text-[var(--jtb-accent-hi)]"
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
                    <Card className="border-dashed border-primary/30 bg-primary/5">
                      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 text-[var(--jtb-accent-hi)] text-xs font-semibold uppercase tracking-wider">
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

            {isSignedIn && remoteBookId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <BookCompanion
                  bookId={remoteBookId}
                  bookTitle={book.title}
                  currentChapter={currentChapter}
                  hasBible={!!bible}
                />
              </motion.div>
            )}

            <PastePassage bookId={book.id} chapter={currentChapter} />

            <motion.div id="scenes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4 scroll-mt-24">
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
                  <Button size="lg" variant="outline" className="w-full h-16 text-lg group bg-primary/5 border-primary/30 text-[var(--jtb-accent-hi)] hover:bg-primary/10">
                    <PlayCircle className="w-5 h-5 mr-3" />
                    Watch as trailer
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Saved scenes */}
            {scenes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <h3 className="font-serif text-xl font-semibold">Saved Scenes</h3>
                <div className="space-y-5">
                  {chapterEntries.map(([chapterNumber, chScenes]) => {
                    const sorted = [...chScenes].sort((a, b) => a.sceneIndex - b.sceneIndex);
                    return (
                      <div key={chapterNumber} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
                            Chapter {chapterNumber}
                          </p>
                          <Link
                            href={`/playback/${book.id}?chapter=${chapterNumber}`}
                            className="text-xs text-[var(--jtb-accent-hi)]/80 hover:text-[var(--jtb-accent-hi)] inline-flex items-center gap-1"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Play trailer
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {sorted.map((scene) => (
                            <SceneTileWithDelete
                              key={scene.id}
                              scene={scene}
                              bookId={book.id}
                              chapterNumber={chapterNumber}
                              onDeleteRequest={() => setDeleteSceneId(scene.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {remoteBook && (
        <EditBookDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode={{ kind: "edit", book: remoteBook }}
        />
      )}

      {/* Delete book confirmation */}
      <AlertDialog open={deleteBookOpen} onOpenChange={setDeleteBookOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{remoteBook?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the book and all{" "}
              {scenes.length > 0 ? `${scenes.length} saved ` : ""}
              scenes from your library. You'll have a few seconds to undo
              from the toast before it's gone for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBook}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBook();
              }}
              disabled={isDeletingBook || scenesLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBook ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : scenesLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading scenes…
                </>
              ) : (
                "Delete book"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete scene confirmation */}
      <AlertDialog
        open={!!deleteSceneId}
        onOpenChange={(open) => !open && setDeleteSceneId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scene?</AlertDialogTitle>
            <AlertDialogDescription>
              "{sceneToDelete?.title}" will be removed. You'll have a few
              seconds to undo from the toast before it's gone for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteScene.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteScene();
              }}
              disabled={deleteScene.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScene.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing…
                </>
              ) : (
                "Delete scene"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function SceneTileWithDelete({
  scene,
  bookId,
  chapterNumber,
  onDeleteRequest,
}: {
  scene: RemoteScene;
  bookId: string;
  chapterNumber: number;
  onDeleteRequest: () => void;
}) {
  const grad = scene.gradientColors;
  const bg =
    grad.length >= 2
      ? `linear-gradient(135deg, ${grad[0]}, ${grad[grad.length - 1]})`
      : `linear-gradient(135deg, #2a1a4e, #1a1a2e)`;

  return (
    <div className="relative group">
      <Link href={`/experience/${bookId}?chapter=${chapterNumber}`}>
        <div
          className="aspect-square overflow-hidden rounded-xl border border-white/5 transition-all cursor-pointer hover:border-primary/40"
          style={{ background: bg }}
        >
          {scene.imageUrl && (
            <img
              src={scene.imageUrl}
              alt={scene.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent rounded-xl" />
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
            <p className="text-[10px] text-[var(--jtb-accent-hi)]/90 font-medium uppercase tracking-wider">
              Ch {scene.chapterNumber}
            </p>
            <p className="text-white font-serif font-semibold line-clamp-2 leading-tight text-sm">
              {scene.title}
            </p>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDeleteRequest();
        }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80 text-white"
        title="Delete scene"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
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
