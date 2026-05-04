import { useState, useEffect, useMemo } from "react";
import { useParams, useSearch, Link } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { useGenerateScene, GeneratedScene } from "@/hooks/useGenerateScene";
import { useRemoteBooks, useRemoteBookScenes } from "@/hooks/useApiLibrary";
import { DEMO_BOOKS, CHAPTERS, SCENE_IMAGES } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

/**
 * Build a shareable URL that hits the api-server's `/api/share/scene`
 * endpoint. That endpoint returns OG-tagged HTML for crawlers and redirects
 * real users to the SPA `/scene-share` page. Image URLs are made absolute
 * because OG meta tags require it.
 */
function buildShareUrl(
  scene: GeneratedScene,
  bookTitle: string,
  bookAuthor: string,
): string {
  const imgAbs = scene.imageUrl
    ? scene.imageUrl.startsWith("http")
      ? scene.imageUrl
      : `${window.location.origin}${scene.imageUrl}`
    : "";
  const params = new URLSearchParams();
  if (scene.title) params.set("title", scene.title);
  if (scene.narration) params.set("narration", scene.narration);
  if (bookTitle) params.set("book", bookTitle);
  if (bookAuthor) params.set("author", bookAuthor);
  if (scene.mood) params.set("mood", scene.mood);
  if (scene.location) params.set("location", scene.location);
  if (imgAbs) params.set("img", imgAbs);
  return `${window.location.origin}/api/share/scene?${params.toString()}`;
}

function SceneShareButton({
  scene,
  bookTitle,
  bookAuthor,
}: {
  scene: GeneratedScene;
  bookTitle: string;
  bookAuthor: string;
}) {
  const { toast } = useToast();

  async function handleShare() {
    const url = buildShareUrl(scene, bookTitle, bookAuthor);
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: scene.title,
          text: scene.narration,
          url,
        });
        return;
      } catch {
        /* user canceled or share failed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Share link copied" });
    } catch {
      toast({
        title: "Couldn't copy link",
        description: "Long-press the address bar after we open the share page.",
        variant: "destructive",
      });
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className="text-white/80 hover:text-white hover:bg-white/10"
    >
      <Share2 className="w-4 h-4 mr-1.5" /> Share
    </Button>
  );
}

export default function Comic() {
  const { id } = useParams<{ id: string }>();
  const searchString = useSearch();
  const chapterNumber = parseInt(new URLSearchParams(searchString).get("chapter") || "1", 10);
  
  const { userLibrary, isSignedIn } = useLibrary();
  const { readCachedScenes } = useGenerateScene();
  const remoteBooks = useRemoteBooks();

  const remoteBookId = useMemo(() => {
    if (!isSignedIn || !id) return null;
    const list = remoteBooks.data ?? [];
    const match =
      list.find((b) => b.demoBookId === id) ?? list.find((b) => b.id === id);
    return match?.id ?? null;
  }, [isSignedIn, id, remoteBooks.data]);
  const remoteScenesQuery = useRemoteBookScenes(remoteBookId);

  const [scenes, setScenes] = useState<GeneratedScene[]>([]);

  const book = userLibrary.find((b) => b.id === id) || DEMO_BOOKS.find((b) => b.id === id);

  useEffect(() => {
    if (!book) return;

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

        <main className="container max-w-3xl mx-auto px-4 py-6 sm:py-12 space-y-8 sm:space-y-16">
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
                  <div className="relative aspect-[3/4] sm:aspect-[4/3] md:aspect-video w-full bg-muted">
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
                    <div className="absolute top-2 right-2 z-10">
                      <SceneShareButton
                        scene={scene}
                        bookTitle={book.title}
                        bookAuthor={book.author}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-8 pointer-events-none">
                      <h3 className="font-serif text-xl sm:text-2xl text-white font-semibold drop-shadow-md mb-1.5 sm:mb-2">
                        {scene.title}
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs uppercase tracking-widest text-white/70 font-medium drop-shadow">
                        <span>{scene.location}</span>
                        <span>·</span>
                        <span>{scene.mood}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-6 md:p-8 bg-card">
                    <p className="font-serif text-base sm:text-xl md:text-2xl leading-relaxed text-card-foreground">
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
