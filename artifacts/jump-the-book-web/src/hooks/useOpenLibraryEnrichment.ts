import { useEffect, useState } from "react";
import {
  searchAndFetchWork,
  type OpenLibraryWorkDetails,
} from "@/lib/openLibrary";

export interface OpenLibraryEnrichment {
  coverUrl: string | null;
  details: OpenLibraryWorkDetails | null;
}

interface CachedEnrichment extends OpenLibraryEnrichment {
  timestamp: number;
}

const PREFIX = "@jtb_enrich_v1_";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function cacheKey(title: string, author: string) {
  const raw = `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
  return PREFIX + hashKey(raw);
}

/**
 * Drop the cached Open Library lookup for a (title, author) pair so the next
 * render of any tile/hero will refetch. Used by "Refresh metadata" buttons.
 */
export function clearEnrichmentCache(title: string, author: string) {
  try {
    localStorage.removeItem(cacheKey(title, author));
  } catch {
    /* non-fatal */
  }
}

function readCache(key: string): OpenLibraryEnrichment | null | "miss" {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "miss";
    const p = JSON.parse(raw) as CachedEnrichment;
    if (Date.now() - p.timestamp > TTL_MS) return "miss";
    return { coverUrl: p.coverUrl, details: p.details };
  } catch {
    return "miss";
  }
}

function writeCache(key: string, value: OpenLibraryEnrichment) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ ...value, timestamp: Date.now() }),
    );
  } catch {
    /* quota errors non-fatal */
  }
}

interface Options {
  enabled?: boolean;
}

/**
 * Look up a book on Open Library by title + author, returning a cover URL
 * (Large size) and work-level details (description, subjects, first sentence).
 * Results are cached in localStorage for 7 days, keyed by a hash of the
 * normalized title + author so the same lookup is shared across components
 * (book detail hero, library card, metadata panel).
 */
export function useOpenLibraryEnrichment(
  title: string | undefined,
  author: string | undefined,
  options: Options = {},
): OpenLibraryEnrichment & { loading: boolean } {
  const enabled = options.enabled ?? true;
  const [loading, setLoading] = useState(enabled);
  const [data, setData] = useState<OpenLibraryEnrichment>({
    coverUrl: null,
    details: null,
  });

  useEffect(() => {
    if (!enabled || !title || !author) {
      setLoading(false);
      return;
    }
    const key = cacheKey(title, author);
    const cached = readCache(key);
    if (cached !== "miss") {
      setData(cached ?? { coverUrl: null, details: null });
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    searchAndFetchWork(title, author, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        const v: OpenLibraryEnrichment = {
          coverUrl: r?.result.coverUrlLarge ?? null,
          details: r?.details ?? null,
        };
        setData(v);
        writeCache(key, v);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [title, author, enabled]);

  return { ...data, loading };
}
