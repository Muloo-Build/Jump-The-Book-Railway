import { Link, useLocation } from "wouter";
import { Book, Compass, Info, Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  const [location] = useLocation();

  if (hideNav) {
    return <div className="min-h-[100dvh] bg-background text-foreground dark">{children}</div>;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Compass className="h-6 w-6 text-primary" />
            <span className="hidden font-serif text-lg font-bold sm:inline-block">
              Jump the Book
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/library"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/library") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Library
            </Link>
            <Link
              href="/upload"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/upload") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Upload
            </Link>
            <Link
              href="/help"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/help") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Help
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
