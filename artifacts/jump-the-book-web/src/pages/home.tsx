import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Library, Sparkles } from "lucide-react";
import Layout from "@/components/layout";
import { motion } from "framer-motion";
import { useLibrary } from "@/lib/library";

export default function Home() {
  const { activeBookId, getPosition } = useLibrary();
  
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl space-y-8"
        >
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="mr-2 h-4 w-4" />
            Your reading, visualized.
          </div>
          
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground">
            See the worlds <br/> you read.
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload your EPUB or pick a classic. As you read, we generate spoiler-safe, 
            cinematic scenes that bring the chapter to life without ruining what happens next.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/library" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 font-serif italic tracking-wide group">
                <Library className="mr-2 h-5 w-5 group-hover:-rotate-12 transition-transform" />
                Open Library
              </Button>
            </Link>
            <Link href="/upload" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 group">
                <BookOpen className="mr-2 h-5 w-5" />
                Upload Book
                <ArrowRight className="ml-2 h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
