import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseBookFile, ACCEPTED_EXTENSIONS, ACCEPTED_LABEL } from "@/lib/parseBook";
import { useLibrary } from "@/lib/library";
import { VISUAL_STYLE_LABELS, SPOILER_MODE_LABELS, VisualStyle, SpoilerMode } from "@/data/books";
import { UploadCloud, BookOpen, Loader2, Wand2, Search, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BookSearch from "@/components/book-search";
import SnapCoverButton from "@/components/snap-cover-button";
import { Show } from "@clerk/react";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { addBook } = useLibrary();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{ title: string; author: string } | null>(null);

  const [style, setStyle] = useState<VisualStyle>("dark-cinematic");
  const [spoiler, setSpoiler] = useState<SpoilerMode>("no-spoilers");
  const [chapter, setChapter] = useState("1");
  const [format, setFormat] = useState("EPUB");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const result = await parseBookFile(file);
      setParsedData({ title: result.title, author: result.author || "Unknown Author" });
      setFormat(result.format);
      toast({
        title: `${result.format} parsed`,
        description: `Found ${result.chapters.length} chapter${result.chapters.length === 1 ? "" : "s"}. Ready to set up your reading experience.`,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We couldn't read that file. Try an EPUB, PDF, or TXT.";
      toast({ title: "Couldn't read that file", description: message, variant: "destructive" });
    } finally {
      setIsParsing(false);
      e.target.value = "";
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleAddBook = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    try {
      const newBookId = await addBook(
        {
          title: parsedData.title,
          author: parsedData.author,
          format,
          currentChapter: parseInt(chapter, 10) || 1,
          currentPage: 1,
          currentAudioTimestamp: "00:00:00",
          spoilerMode: spoiler,
          userNote: "",
          visualStyle: style,
          progress: 0,
          coverGradient: ["#1a1525", "#2d2440", "#453560"],
        },
        { source: "upload" },
      );
      setLocation(`/book/${newBookId}`);
    } catch (err) {
      toast({
        title: "Couldn't save book",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto px-4 py-6 sm:py-10 md:py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">Add a book</h1>
          <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
            Pick the way that fits — point your camera, search by title, or
            upload a file. Whatever you bring in, we'll start painting scenes.
          </p>

          {!parsedData && (
            <>
              {/* Two priority paths up top: Smart Setup for modern books and
                  Snap Cover for physical books. Both are one-tap entries on
                  mobile and replace the old "scroll through tabs to find it"
                  flow. Snap is signed-in only (it's the SnapCoverButton's
                  built-in <Show when="signed-in">). */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                <Link
                  href="/setup-book"
                  className="group rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-5 flex items-start gap-4 hover:border-primary/70 transition-colors"
                  data-testid="link-smart-setup"
                >
                  <div className="shrink-0 rounded-xl bg-primary/20 text-[var(--jtb-accent-hi)] p-3">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--jtb-accent-hi)]/90 font-medium">
                      Smart Setup
                    </div>
                    <h3 className="font-serif text-base sm:text-lg font-semibold leading-tight">
                      Add a modern book by title
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      We build a spoiler-safe profile so scenes match what
                      you've already read.
                    </p>
                  </div>
                </Link>

                <Show when="signed-in">
                  <SnapCoverButton variant="tile" label="Snap a cover" />
                </Show>
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    className="group rounded-2xl border-2 border-dashed border-border/50 bg-card/30 p-5 flex items-start gap-4 hover:border-border transition-colors"
                  >
                    <div className="shrink-0 rounded-xl bg-white/5 text-foreground/70 p-3">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Snap a cover
                      </div>
                      <h3 className="font-serif text-base sm:text-lg font-semibold leading-tight">
                        Sign in to use the camera
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Point your phone at any physical book and we'll find
                        the right edition.
                      </p>
                    </div>
                  </Link>
                </Show>
              </div>

              <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid grid-cols-2 w-full mb-4">
                  <TabsTrigger value="search" data-testid="tab-search">
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="upload" data-testid="tab-upload">
                    <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                    Upload file
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="mt-2">
                  <Card className="border-border/40 bg-card/30">
                    <CardContent className="py-5 sm:py-6">
                      <BookSearch />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="mt-2">
                  <Card className="border-dashed border-2 border-border/50 bg-card/30">
                    <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                      <div className="rounded-full bg-primary/10 p-4 mb-4">
                        <UploadCloud className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-serif font-semibold mb-2">Drop in your book</h3>
                      <p className="text-muted-foreground mb-2 max-w-sm text-sm">
                        Supports {ACCEPTED_LABEL}. We read it right in your
                        browser — the file never leaves your device.
                      </p>
                      <p className="text-xs text-muted-foreground/70 mb-6 max-w-sm">
                        Works on desktop, tablet, and mobile. Audiobooks
                        aren't supported yet.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_EXTENSIONS}
                        onChange={handleFileChange}
                        className="sr-only"
                        disabled={isParsing}
                        aria-label="Upload a book file"
                        data-testid="file-input"
                      />
                      <Button
                        type="button"
                        disabled={isParsing}
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="choose-file-button"
                      >
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                        {isParsing ? "Reading..." : "Choose File"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}

          {parsedData && (
            <Card className="bg-card/50 border-border/40">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">{parsedData.title}</CardTitle>
                <CardDescription>by {parsedData.author}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>What chapter are you on?</Label>
                    <Input
                      type="number"
                      min="1"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Input
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      placeholder="e.g. EPUB, Paperback"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visual Style</Label>
                    <Select value={style} onValueChange={(v: VisualStyle) => setStyle(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(VISUAL_STYLE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Spoiler Protection</Label>
                    <Select value={spoiler} onValueChange={(v: SpoilerMode) => setSpoiler(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SPOILER_MODE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setParsedData(null)} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handleAddBook} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSaving ? "Adding..." : "Add to Library"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
