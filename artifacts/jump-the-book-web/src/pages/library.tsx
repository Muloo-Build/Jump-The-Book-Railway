import { Link } from "wouter";
import Layout from "@/components/layout";
import { DEMO_BOOKS, Book } from "@/data/books";
import { useLibrary } from "@/lib/library";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function Library() {
  const { userLibrary } = useLibrary();

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-12 space-y-12">
        <div>
          <h1 className="font-serif text-4xl font-bold mb-4">Your Library</h1>
          <p className="text-muted-foreground text-lg">
            Pick up where you left off, or start a new journey.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-semibold border-b border-border/40 pb-2">
            My Books
          </h2>
          {userLibrary.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-12 text-center flex flex-col items-center">
              <p className="text-muted-foreground mb-6">Your library is empty.</p>
              <Link href="/upload">
                <div className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="mr-2 h-4 w-4" /> Add your first book
                </div>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {userLibrary.map((book, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={book.id}
                >
                  <Link href={`/book/${book.id}`}>
                    <Card className="overflow-hidden hover:ring-2 ring-primary/50 transition-all cursor-pointer h-full border-border/40 bg-card/50">
                      <div
                        className="aspect-[2/3] w-full"
                        style={{
                          background: `linear-gradient(to bottom right, ${book.coverGradient[0]}, ${book.coverGradient[1]})`,
                        }}
                      />
                      <CardContent className="p-4">
                        <h3 className="font-serif font-bold line-clamp-1">{book.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {book.author}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-semibold border-b border-border/40 pb-2">
            Classics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {DEMO_BOOKS.map((book, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={book.id}
              >
                <Link href={`/book/${book.id}`}>
                  <Card className="overflow-hidden hover:ring-2 ring-primary/50 transition-all cursor-pointer h-full border-border/40 bg-card/50">
                    <div
                      className="aspect-[2/3] w-full relative"
                      style={{
                        background: `linear-gradient(to bottom right, ${book.coverGradient[0]}, ${book.coverGradient[1]})`,
                      }}
                    >
                      {book.heroImage && (
                        <img 
                          src={`${import.meta.env.BASE_URL}images/${book.heroImage}.png`} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-serif font-bold line-clamp-1">{book.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {book.author}
                      </p>
                      <p className="text-xs text-primary mt-2">{book.tagline}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
