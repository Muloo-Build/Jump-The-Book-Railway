import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Public, no-auth scene-preview landing page.
 * The api-server `/api/share/scene` endpoint emits OG meta + redirects here.
 * All scene data lives in the URL — no DB lookup, no auth, no PII.
 */
export default function SceneShare() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const title = params.get("title") ?? "A scene";
  const narration = params.get("narration") ?? "";
  const book = params.get("book") ?? "";
  const author = params.get("author") ?? "";
  const img = params.get("img") ?? "";
  const mood = params.get("mood") ?? "";
  const location = params.get("location") ?? "";

  useEffect(() => {
    const fullTitle = `${title}${book ? ` — ${book}` : ""} · Jump the Book`;
    const previous = document.title;
    document.title = fullTitle;
    return () => { document.title = previous; };
  }, [title, book]);

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6">
        <Card className="overflow-hidden border-border/50 bg-card/30 shadow-xl ring-1 ring-border/50">
          {img ? (
            <div className="relative aspect-video w-full bg-muted">
              <img
                src={img}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                <h1 className="font-serif text-3xl md:text-4xl text-white font-semibold drop-shadow-md mb-2">
                  {title}
                </h1>
                {(location || mood) && (
                  <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/70 font-medium drop-shadow flex-wrap">
                    {location && <span>{location}</span>}
                    {location && mood && <span>•</span>}
                    {mood && <span>{mood}</span>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-8 border-b border-border/40">
              <h1 className="font-serif text-3xl md:text-4xl font-semibold">{title}</h1>
            </div>
          )}
          <CardContent className="p-6 md:p-8 bg-card space-y-4">
            {narration && (
              <p className="font-serif text-xl md:text-2xl leading-relaxed text-card-foreground italic">
                &ldquo;{narration}&rdquo;
              </p>
            )}
            {book && (
              <p className="text-sm text-muted-foreground">
                From <span className="font-medium text-foreground">{book}</span>
                {author && <> by {author}</>}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-[var(--jtb-accent-hi)]" />
          <h2 className="font-serif text-2xl font-semibold">See the worlds you read</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Jump the Book turns the chapter you're on into spoiler-safe scenes
            you can look at while you read.
          </p>
          <Link href="/">
            <Button size="lg" className="mt-2">
              Try Jump the Book <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
