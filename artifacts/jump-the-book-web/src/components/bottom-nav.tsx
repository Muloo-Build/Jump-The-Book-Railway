import { Link, useLocation } from "wouter";
import { BookOpen, Library, Compass, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof BookOpen;
  matchPrefixes?: string[];
}

const ITEMS: NavItem[] = [
  {
    href: "/now-reading",
    label: "Now Reading",
    icon: BookOpen,
    matchPrefixes: ["/now-reading", "/experience", "/comic", "/playback"],
  },
  {
    href: "/library",
    label: "Bookshelf",
    icon: Library,
    matchPrefixes: ["/library", "/book", "/position"],
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
    matchPrefixes: ["/discover"],
  },
  {
    href: "/upload",
    label: "Add",
    icon: Plus,
    matchPrefixes: ["/upload", "/setup-book", "/generate"],
  },
];

export default function BottomNav() {
  const [location] = useLocation();

  const isActive = (item: NavItem) => {
    const prefixes = item.matchPrefixes ?? [item.href];
    return prefixes.some((p) => location === p || location.startsWith(`${p}/`) || location.startsWith(`${p}?`));
  };

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 inset-x-0 z-[60] border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-[10px] font-medium tracking-wide transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jtb-accent-hi)]/60 focus-visible:ring-inset",
                  active
                    ? "text-[var(--jtb-accent-hi)]"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_rgba(201,169,106,0.4)]")} aria-hidden />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
