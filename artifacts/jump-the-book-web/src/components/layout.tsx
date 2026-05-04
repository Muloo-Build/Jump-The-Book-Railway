import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, User as UserIcon, Settings, Search } from "lucide-react";
import { Show, useUser, useClerk } from "@clerk/react";
import { useRemoteUser } from "@/hooks/useApiLibrary";
import { avatarUrl } from "@/data/avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import StreakBadge from "@/components/streak-badge";
import BottomNav from "@/components/bottom-nav";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  // Bunny avatar wins over Clerk photo when the user has picked one. We
  // don't gate the query on signed-in here — useRemoteUser already returns
  // `undefined` data for signed-out users, and this component only renders
  // inside <Show when="signed-in">, so we always have a Clerk session.
  const remote = useRemoteUser();
  const bunny = avatarUrl(remote.data?.avatarId ?? null);
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
          className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 text-[var(--jtb-accent-hi)] font-medium text-sm flex items-center justify-center hover:bg-primary/25 transition-colors overflow-hidden"
          aria-label="Account menu"
        >
          {bunny ? (
            <img
              src={bunny}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : user?.hasImage && user.imageUrl ? (
            // Clerk's `imageUrl` is always populated — it returns a generic
            // silhouette placeholder when the user has no real photo. Use
            // `hasImage` to detect a real Google/uploaded photo and fall back
            // to initials otherwise.
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
          <Link href="/now-reading">
            <UserIcon className="w-4 h-4 mr-2" />
            Now Reading
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/library">
            <UserIcon className="w-4 h-4 mr-2" />
            My Bookshelf
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings className="w-4 h-4 mr-2" />
            Account &amp; preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help">
            <UserIcon className="w-4 h-4 mr-2" />
            Help
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
        className="h-9 w-56 lg:w-64 rounded-md border border-border/40 bg-card/30 pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
      />
    </form>
  );
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  const [location] = useLocation();

  if (hideNav) {
    return <div className="min-h-[100dvh] bg-background text-foreground dark overflow-x-hidden">{children}</div>;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark font-sans overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="container flex h-14 max-w-screen-2xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}logo-mark.svg`}
              alt="Jump the Book"
              className="h-7 w-7 rounded-md transition-transform group-hover:rotate-[-6deg]"
            />
            <span className="hidden font-serif text-lg sm:inline-block tracking-tight">
              <span className="italic text-primary">Jump</span>{" "}
              <span className="text-muted-foreground/70 text-[0.85em]">the</span>{" "}
              Book
            </span>
          </Link>
          {/* Top nav links: hidden on mobile (bottom tabs handle that). On
              tablet+ the horizontal nav returns. Help moves out of primary
              nav and into the avatar dropdown to reduce clutter. */}
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium overflow-x-auto no-scrollbar min-w-0">
            <Link
              href="/now-reading"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/now-reading")
                  ? "text-foreground"
                  : "text-foreground/60",
                "shrink-0",
              )}
            >
              Now Reading
            </Link>
            <Link
              href="/library"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/library")
                  ? "text-foreground"
                  : "text-foreground/60",
                "shrink-0",
              )}
            >
              Bookshelf
            </Link>
            <Link
              href="/discover"
              className={cn(
                "transition-colors hover:text-foreground/80",
                location?.startsWith("/discover")
                  ? "text-foreground"
                  : "text-foreground/60",
                "shrink-0",
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
                "shrink-0",
              )}
            >
              Add
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
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
                  className="bg-primary text-primary-foreground hover:brightness-110 font-semibold"
                >
                  Get started
                </Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <StreakBadge />
              <UserMenu />
            </Show>
          </div>
        </div>
      </header>
      {/* Bottom padding on mobile so content isn't covered by the bottom
          tab bar (≈64px nav + safe-area inset). */}
      <main className="flex-1 flex flex-col pb-[calc(64px+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
