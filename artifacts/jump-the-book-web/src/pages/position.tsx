import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { DEMO_BOOKS } from "@/data/books";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Position() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { userLibrary, getPosition, updatePosition } = useLibrary();
  const { toast } = useToast();

  const book = userLibrary.find((b) => b.id === id) || DEMO_BOOKS.find((b) => b.id === id);
  const currentPos = getPosition(id!);

  const [chapter, setChapter] = useState(currentPos?.chapter?.toString() || book?.currentChapter?.toString() || "1");
  const [page, setPage] = useState(currentPos?.page?.toString() || "1");
  const [timestamp, setTimestamp] = useState(currentPos?.timestamp || "");
  const [note, setNote] = useState("");

  if (!book) return null;

  const handleSave = () => {
    updatePosition({
      bookId: book.id,
      bookFormat: book.format,
      chapter: parseInt(chapter, 10) || 1,
      page: parseInt(page, 10) || 1,
      timestamp,
      percentComplete: 0, 
    });
    
    toast({
      title: "Position saved",
      description: `Updated location for ${book.title}`,
    });
    
    setLocation(`/book/${book.id}`);
  };

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary/10 p-3 rounded-full">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">Update Position</h1>
              <p className="text-muted-foreground">{book.title}</p>
            </div>
          </div>

          <Card className="bg-card/50 border-border/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-serif">Where are you?</CardTitle>
              <CardDescription>Keep track of your current location to generate the right scenes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter</Label>
                  <Input 
                    id="chapter"
                    type="number" 
                    min="1"
                    value={chapter} 
                    onChange={(e) => setChapter(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page">Page (optional)</Label>
                  <Input 
                    id="page"
                    type="number" 
                    min="1"
                    value={page} 
                    onChange={(e) => setPage(e.target.value)} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="timestamp">Audio Timestamp (optional)</Label>
                  <Input 
                    id="timestamp"
                    type="text" 
                    placeholder="e.g. 01:23:45"
                    value={timestamp} 
                    onChange={(e) => setTimestamp(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Useful if you're listening to an audiobook version.</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="note">Notes</Label>
                  <Textarea 
                    id="note"
                    placeholder="Jot down a quick thought or reminder..."
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-4">
                <Button variant="outline" onClick={() => setLocation(`/book/${book.id}`)}>Cancel</Button>
                <Button onClick={handleSave} className="min-w-[120px]">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
