import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Upload as UploadIcon, BookOpen, Sparkles } from "lucide-react";
import type { UserLibraryItem } from "@/data/books";

interface Props {
  nowReading: UserLibraryItem | null;
  totalBooks: number;
}

function useNowPill() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const day = now
    .toLocaleDateString(undefined, { weekday: "long" })
    .toUpperCase();
  const time = now
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();
  return `${day}  ·  ${time}`;
}

function buildSubtext(nowReading: UserLibraryItem | null, total: number) {
  if (!nowReading) {
    if (total === 0) {
      return "Your shelf is waiting. Add a book and we'll start painting the scenes.";
    }
    return "Pick a book to pick up where you left off.";
  }
  const ch = nowReading.currentChapter ?? 1;
  if (ch <= 1) {
    return `${nowReading.title} is queued. The first scene is moments away.`;
  }
  return `Chapter ${ch} of ${nowReading.title} is queued and waiting.`;
}

/**
 * Best-effort display name. Tries Clerk's first name → username → the
 * local part of the primary email address (e.g. "ada.lovelace@foo.com" →
 * "Ada"). Falls back to "Reader" only when truly nothing is available,
 * so email-only signups still get a personal greeting.
 */
function resolveFirstName(user: ReturnType<typeof useUser>["user"]): string {
  const fn = user?.firstName?.trim();
  if (fn) return fn;
  const un = user?.username?.trim();
  if (un) return un;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const local = email.split("@")[0] ?? "";
  // Take everything before the first separator and capitalize. e.g.
  // "ada.lovelace+tag" → "Ada", "j_smith42" → "J".
  const seed = local.split(/[._+\-0-9]/).filter(Boolean)[0] ?? "";
  if (seed) return seed.charAt(0).toUpperCase() + seed.slice(1).toLowerCase();
  return "Reader";
}

export default function WelcomeHero({ nowReading, totalBooks }: Props) {
  const { user } = useUser();
  const datePill = useNowPill();
  const firstName = resolveFirstName(user);
  const sub = buildSubtext(nowReading, totalBooks);

  const continueHref = nowReading
    ? `/experience/${nowReading.id}?chapter=${nowReading.currentChapter ?? 1}`
    : "/library";

  return (
    <section className="space-y-5">
      <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--jtb-accent-hi)]/90 font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--jtb-accent-hi)]/80" />
        {datePill}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:items-end">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            <Show when="signed-in">
              Welcome back,{" "}
              <span className="italic text-[var(--jtb-accent-hi)]">{firstName}</span>.
            </Show>
            <Show when="signed-out">
              Welcome to{" "}
              <span className="italic text-[var(--jtb-accent-hi)]">Jump the Book</span>.
            </Show>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl">
            {sub}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] h-10 px-4 text-sm font-medium transition-colors"
          >
            <UploadIcon className="w-4 h-4" />
            Upload
          </Link>
          {nowReading ? (
            <Link
              href={continueHref}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-black hover:bg-[var(--jtb-accent-hi)] h-10 px-4 text-sm font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Continue reading
            </Link>
          ) : (
            <Link
              href="/setup-book"
              className="inline-flex items-center gap-2 rounded-md bg-primary text-black hover:bg-[var(--jtb-accent-hi)] h-10 px-4 text-sm font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Add a book
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
