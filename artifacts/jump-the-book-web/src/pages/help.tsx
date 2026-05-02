import Layout from "@/components/layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Shield, Palette } from "lucide-react";
import { motion } from "framer-motion";

export default function Help() {
  return (
    <Layout>
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          
          <div className="text-center space-y-4">
            <h1 className="font-serif text-4xl md:text-5xl font-bold">How it Works</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about using Jump the Book as your reading companion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex flex-col items-center text-center">
              <Shield className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-serif font-bold text-lg mb-2">Spoiler Safe</h3>
              <p className="text-sm text-muted-foreground">We only generate imagery for the chapter you specify. Future events stay hidden.</p>
            </div>
            <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex flex-col items-center text-center">
              <BookOpen className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-serif font-bold text-lg mb-2">Private Parsing</h3>
              <p className="text-sm text-muted-foreground">EPUB files are parsed entirely in your browser. We never upload your books.</p>
            </div>
            <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex flex-col items-center text-center">
              <Palette className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-serif font-bold text-lg mb-2">Visual Styles</h3>
              <p className="text-sm text-muted-foreground">Choose from Dark Cinematic, Comic, Watercolour, and more to match your vibe.</p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <h2 className="font-serif text-2xl font-bold mb-6 border-b border-border/40 pb-2">Frequently Asked Questions</h2>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="font-serif text-lg">Are my EPUB files uploaded to a server?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  No. When you select an EPUB file, it is parsed entirely within your browser using JavaScript. We extract the chapter titles and text directly on your device. We never upload, store, or transmit the full contents of your books.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="font-serif text-lg">What does "Spoiler Mode" do?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Spoiler protection controls how much context the AI uses when generating images. "No Spoilers" ensures it strictly only looks at the exact excerpt/chapter you specify. "Full Companion" gives it broader context to create richer images, but runs a slight risk of depicting events slightly ahead of your exact page.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="font-serif text-lg">Can I read the book in this app?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Jump the Book is designed as a *companion* to your reading experience, not a replacement for your e-reader or physical book. You read on your preferred device or paper, and use this app to generate immersive visual scenes for the chapter you just finished (or are currently reading).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="font-serif text-lg">How do I delete a book from my library?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Currently, books are stored locally in your browser cache. You can reset your library by clearing your browser's local storage for this site. In a future update, we'll add individual delete buttons for user-uploaded books. (Demo books are permanently available).
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
