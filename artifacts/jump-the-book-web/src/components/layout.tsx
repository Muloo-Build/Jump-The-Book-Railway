import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User as UserIcon, Settings, Search } from "lucide-react";
import { Show, useUser, useClerk } from "@clerk/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const initials = (() => {
    const f = user?.firstName?.[0] ?? "";
    const l = user?.lastName?.[0] ?? "";
    return (f + l) || user?.username?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "?";
  })().toUpperCase();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-9 w-9 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200 font-medium text-sm flex items-center justify-center hover:bg-amber-400/25 transition-colors"
          aria-label="Account menu"
        >
          {/* Clerk's `imageUrl` is always populated — it returns a generic
              silhouette placeholder when the user has no real photo. Use
              `hasImage` to detect a real Google/uploaded photo and fall back
              to initials otherwise. */}
          {user?.hasImage && user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {user?.fullName || user?.username || "Reader"}
            </p>
            {email && (
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/library">
            <UserIcon className="w-4 h-4 mr-2" />
            My library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings className="w-4 h-4 mr-2" />
            Account &amp; preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderSearch() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = q.trim();
        setLocation(
          trimmed ? `/library?q=${encodeURIComponent(trimmed)}` : "/library",
        );
      }}
      className="hidden md:flex relative items-center"
    >
      <Search
        className="w-3.5 h-3.5 absolute left-3 text-muted-foreground/70 pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search library…"
        aria-label="Search your library"
        className="h-9 w-56 lg:w-64 rounded-md border border-border/40 bg-card/30 pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40 focus:border-amber-400/40 transition-colors"
      />
    </form>
  );
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
          <Link href="/" className="mr-6 flex items-center gap-2 group">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Jump the Book"
              className="h-7 w-7 transition-transform group-hover:rotate-[-6deg]"
            />
            <span className="hidden font-serif text-lg sm:inline-block">
              Jump <span className="italic text-amber-200">the</span> Book
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/library"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/library")
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              Library
            </Link>
            <Link
              href="/discover"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/discover")
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              Discover
            </Link>
            <Link
              href="/upload"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/upload")
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              Upload
            </Link>
            <Link
              href="/help"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/help")
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              Help
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <HeaderSearch />
            <Show when="signed-out">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="bg-amber-400 text-black hover:bg-amber-300"
                >
                  Get started
                </Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <UserMenu />
            </Show>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
