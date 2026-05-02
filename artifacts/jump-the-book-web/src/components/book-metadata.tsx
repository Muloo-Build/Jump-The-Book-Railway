import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookText, Tag } from "lucide-react";
import { searchAndFetchWork, type OpenLibraryWorkDetails } from "@/lib/openLibrary";
import { Skeleton } from "@/components/ui/skeleton";

interface BookMetadataProps {
  title: string;
  author: string;
}

const STORAGE_PREFIX = "@jtb_meta_v1_";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedMeta {
  details: OpenLibraryWorkDetails | null;
  timestamp: number;
}

// djb2 — stable, collision-resistant for short strings, handles any unicode.
// Plain regex stripping silently collapses non-ASCII titles to the same key.
function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function cacheKey(title: string, author: string) {
  const raw = `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
  return STORAGE_PREFIX + hashKey(raw);
}

function readCache(key: string): OpenLibraryWorkDetails | null | "miss" {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "miss";
    const parsed = JSON.parse(raw) as CachedMeta;
    if (Date.now() - parsed.timestamp > TTL_MS) return "miss";
    return parsed.details;
  } catch {
    return "miss";
  }
}

function writeCache(key: string, details: OpenLibraryWorkDetails | null) {
  try {
    const payload: CachedMeta = { details, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota errors non-fatal */
  }
}

export default function BookMetadata({ title, author }: BookMetadataProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<OpenLibraryWorkDetails | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const key = cacheKey(title, author);
    const cached = readCache(key);
    if (cached !== "miss") {
      setDetails(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    searchAndFetchWork(title, author, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        const d = r?.details ?? null;
        setDetails(d);
        writeCache(key, d);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDetails(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [title, author]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!details || (!details.description && details.subjects.length === 0)) {
    return null;
  }

  const desc = details.description ?? "";
  const isLong = desc.length > 320;
  const visibleDesc = expanded || !isLong ? desc : desc.slice(0, 320).trimEnd() + "…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <BookText className="w-3.5 h-3.5" />
        About this book
      </div>
      {desc && (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {visibleDesc}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
      {details.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {details.subjects.slice(0, 6).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] px-2 py-0.5 text-muted-foreground"
            >
              <Tag className="w-2.5 h-2.5" />
              {s}
            </span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/60 pt-1">
        Metadata via Open Library
      </p>
    </motion.div>
  );
}
