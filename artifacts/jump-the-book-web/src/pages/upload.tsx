import { useRef, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseBookFile, ACCEPTED_EXTENSIONS, ACCEPTED_LABEL } from "@/lib/parseBook";
import { useLibrary } from "@/lib/library";
import { VISUAL_STYLE_LABELS, SPOILER_MODE_LABELS, VisualStyle, SpoilerMode } from "@/data/books";
import { UploadCloud, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
      const newBookId = await addBook({
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
      });
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
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-4xl font-bold mb-8">Upload Book</h1>
          
          {!parsedData ? (
            <Card className="border-dashed border-2 border-border/50 bg-card/30">
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <UploadCloud className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-2">Drop in your book</h3>
                <p className="text-muted-foreground mb-2 max-w-sm">
                  Supports {ACCEPTED_LABEL}. We read it right in your browser — the file never leaves your device.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6 max-w-sm">
                  Works on desktop, tablet, and mobile. Audiobooks aren't supported yet.
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
          ) : (
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
