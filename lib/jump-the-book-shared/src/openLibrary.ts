// Open Library helpers shared between the web and mobile apps.
// Uses the global `fetch` available in browsers and React Native runtimes.

export interface OpenLibrarySearchResult {
  key: string;
  title: string;
  author: string;
  firstPublishYear: number | null;
  pageCount: number | null;
  coverUrl: string | null;       // M (~180px) — for thumbs / search dropdown
  coverUrlLarge: string | null;  // L (~500px) — for hero cover
  workKey: string;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
}

interface OpenLibraryResponse {
  docs: OpenLibraryDoc[];
  numFound: number;
}

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVER_URL = "https://covers.openlibrary.org/b/id";
const WORK_URL = "https://openlibrary.org";

export interface OpenLibraryWorkDetails {
  description: string | null;
  subjects: string[];
  firstSentence: string | null;
}

function coverUrlFor(coverId: number | undefined, size: "S" | "M" | "L" = "M"): string | null {
  if (!coverId) return null;
  return `${COVER_URL}/${coverId}-${size}.jpg`;
}

async function searchOpenLibraryUncached(
  trimmed: string,
  signal?: AbortSignal,
): Promise<OpenLibrarySearchResult[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=20&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Open Library search failed (${res.status})`);
  }
  const data = (await res.json()) as OpenLibraryResponse;
  return data.docs
    .filter((d) => d.title && d.author_name && d.author_name.length > 0)
    .map((d) => ({
      key: d.key,
      workKey: d.key,
      title: d.title,
      author: (d.author_name ?? ["Unknown"])[0],
      firstPublishYear: d.first_publish_year ?? null,
      pageCount: d.number_of_pages_median ?? null,
      coverUrl: coverUrlFor(d.cover_i, "M"),
      coverUrlLarge: coverUrlFor(d.cover_i, "L"),
    }))
    .slice(0, 12);
}

const searchCache = createRequestCache<OpenLibrarySearchResult[]>({
  ttlMs: 60 * 60 * 1000,
  maxEntries: 50,
});

export async function searchOpenLibrary(
  query: string,
  signal?: AbortSignal,
): Promise<OpenLibrarySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const key = trimmed.toLowerCase();
  return cachedRequest(searchCache, key, signal, (s) =>
    searchOpenLibraryUncached(trimmed, s),
  );
}

interface OpenLibraryWorkResponse {
  description?: string | { value?: string };
  subjects?: string[];
  first_sentence?: string | { value?: string } | Array<string | { value?: string }>;
}

function flatString(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && v.length > 0) return flatString(v[0]);
  if (typeof v === "object" && v !== null && "value" in v) {
    return flatString((v as { value: unknown }).value);
  }
  return null;
}

async function fetchWorkDetailsUncached(
  key: string,
  signal?: AbortSignal,
): Promise<OpenLibraryWorkDetails | null> {
  let res: Response;
  try {
    res = await fetch(`${WORK_URL}${key}.json`, { signal });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let data: OpenLibraryWorkResponse;
  try {
    data = (await res.json()) as OpenLibraryWorkResponse;
  } catch {
    return null;
  }
  return {
    description: flatString(data.description),
    subjects: Array.isArray(data.subjects) ? data.subjects.slice(0, 8) : [],
    firstSentence: flatString(data.first_sentence),
  };
}

const workDetailsCache = createRequestCache<OpenLibraryWorkDetails | null>({
  ttlMs: 24 * 60 * 60 * 1000,
  maxEntries: 100,
});

export async function fetchWorkDetails(
  workKey: string,
  signal?: AbortSignal,
): Promise<OpenLibraryWorkDetails | null> {
  const key = workKey.startsWith("/") ? workKey : `/${workKey}`;
  return cachedRequest(workDetailsCache, key, signal, (s) =>
    fetchWorkDetailsUncached(key, s),
  );
}

export interface SeriesInfo {
  seriesName: string;
  books: {
    title: string;
    author: string;
    coverUrl: string | null;
    coverUrlLarge: string | null;
    workKey: string;
    seriesOrder: number;
  }[];
}

interface EditionsResponse {
  entries?: Array<{
    series?: string[];
    title?: string;
  }>;
}

interface SearchDocWithSeries extends OpenLibraryDoc {
  series?: string[];
}

interface SearchResponseWithSeries {
  docs: SearchDocWithSeries[];
  numFound: number;
}

function cleanSeriesName(raw: string): string {
  return raw
    .replace(/\s*[#(]\s*\d+.*$/, "")
    .replace(/,?\s*(?:book|volume|part|no\.?|number)\s*\d+.*$/i, "")
    .replace(/\s*\(\s*\)/, "")
    .trim();
}

function isAscii(s: string): boolean {
  return /^[\x20-\x7E]+$/.test(s);
}

function escapeFieldValue(v: string): string {
  return v.replace(/"/g, "");
}

async function tryEditionsSeries(
  workPath: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${WORK_URL}${workPath}/editions.json?limit=20&fields=series,title`,
      { signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as EditionsResponse;
    const entries = data.entries ?? [];
    let fallback: string | null = null;
    for (const ed of entries) {
      if (Array.isArray(ed.series) && ed.series.length > 0) {
        const cleaned = cleanSeriesName(ed.series[0]);
        if (cleaned.length > 1) {
          if (isAscii(cleaned)) return cleaned;
          if (!fallback) fallback = cleaned;
        }
      }
    }
    return fallback;
  } catch {}
  return null;
}

async function trySearchSeries(
  title: string,
  authorHint: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      limit: "5",
      fields: "key,title,author_name,series",
    });
    if (authorHint) {
      params.set("q", `title:"${escapeFieldValue(title)}" author:"${escapeFieldValue(authorHint)}"`);
    } else {
      params.set("q", escapeFieldValue(title));
    }
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as SearchResponseWithSeries;
    for (const doc of data.docs) {
      if (Array.isArray(doc.series) && doc.series.length > 0) {
        const cleaned = cleanSeriesName(doc.series[0]);
        if (cleaned.length > 1) return cleaned;
      }
    }
  } catch {}
  return null;
}

function trySubjectsAndLinks(workData: Record<string, unknown>): string | null {
  const allSubjects = Array.isArray(workData.subjects)
    ? (workData.subjects as string[])
    : [];

  for (const s of allSubjects) {
    const tagMatch = s.match(/^[Ss]erie[s]?[:\s_]+(.+)$/);
    if (tagMatch) {
      const cleaned = cleanSeriesName(tagMatch[1].replace(/_/g, " "));
      if (cleaned.length > 1) return cleaned;
    }
  }

  const keywordSubjects = allSubjects.filter(
    (s) =>
      !s.startsWith("nyt:") &&
      (/series/i.test(s) || /trilogy/i.test(s) || /saga/i.test(s)),
  );
  if (keywordSubjects.length > 0) return cleanSeriesName(keywordSubjects[0]);

  const links = workData.links as Array<{ title?: string; url?: string }> | undefined;
  if (links && links.length > 0 && links[0]?.title) {
    return cleanSeriesName(links[0].title);
  }
  return null;
}

const COMPILATION_PATTERN = /\b(box\s*set|collection\s*set|trilogy\s*box|complete\s*series|omnibus|serie completa|\d+\s*books?\s*(collection|set)|edition\s*series)\b|\(series\)\s*\d+-\d+|\(.+\/.+\/.+\)/i;

function isPrimarilyLatinScript(title: string): boolean {
  const letters = title.match(/\p{L}/gu);
  if (!letters || letters.length === 0) return true;
  const latinLetters = title.match(/\p{Script=Latin}/gu);
  const latinCount = latinLetters?.length ?? 0;
  return latinCount / letters.length >= 0.8;
}

async function fetchSeriesBooks(
  seriesName: string,
  authorHint: string,
  signal?: AbortSignal,
): Promise<SeriesInfo["books"]> {
  const tryQuery = async (queryString: string): Promise<SeriesInfo["books"]> => {
    const res = await fetch(
      `${SEARCH_URL}?${queryString}`,
      { signal },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as SearchResponseWithSeries;

    const seen = new Set<string>();
    return data.docs
      .filter((d) => {
        if (!d.title || !d.author_name || d.author_name.length === 0) return false;
        if (COMPILATION_PATTERN.test(d.title)) return false;
        if (!isPrimarilyLatinScript(d.title)) return false;
        const lower = d.title.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .map((d, i) => ({
        title: d.title,
        author: (d.author_name ?? ["Unknown"])[0],
        coverUrl: coverUrlFor(d.cover_i, "M"),
        coverUrlLarge: coverUrlFor(d.cover_i, "L"),
        workKey: d.key,
        seriesOrder: i + 1,
      }))
      .slice(0, 12);
  };

  try {
    const authorPart = authorHint ? ` author:"${escapeFieldValue(authorHint)}"` : "";
    const seriesParams = new URLSearchParams({
      q: `series:"${escapeFieldValue(seriesName)}"${authorPart}`,
      limit: "20",
      fields: "key,title,author_name,cover_i,series",
      sort: "old",
    });
    let books = await tryQuery(seriesParams.toString());

    if (books.length === 0) {
      const fallbackParams = new URLSearchParams({
        q: `${escapeFieldValue(seriesName)}${authorPart}`,
        limit: "20",
        fields: "key,title,author_name,cover_i,series",
        sort: "old",
      });
      books = await tryQuery(fallbackParams.toString());
    }
    return books;
  } catch {
    return [];
  }
}

interface SeriesCacheEntry {
  expiresAt: number;
  lastAccessedAt: number;
  value: SeriesInfo | null;
}

const SERIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SERIES_CACHE_MAX_ENTRIES = 50;
const SERIES_CACHE_STORAGE_KEY = "@jtb_series_cache_v1";
const SERIES_CACHE_STORAGE_VERSION = 1;

const seriesInfoCache = new Map<string, SeriesCacheEntry>();
const seriesInfoInFlight = new Map<string, Promise<SeriesInfo | null>>();

interface PersistedCachePayload {
  version: number;
  entries: Array<[string, SeriesCacheEntry]>;
}

function getSeriesCacheStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined") return null;
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls || typeof ls.getItem !== "function") return null;
    return ls;
  } catch {
    return null;
  }
}

function isValidSeriesBook(value: unknown): value is SeriesInfo["books"][number] {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  if (typeof b.title !== "string") return false;
  if (typeof b.author !== "string") return false;
  if (typeof b.workKey !== "string") return false;
  if (typeof b.seriesOrder !== "number") return false;
  if (b.coverUrl !== null && typeof b.coverUrl !== "string") return false;
  if (b.coverUrlLarge !== null && typeof b.coverUrlLarge !== "string") return false;
  return true;
}

function isValidSeriesInfo(value: unknown): value is SeriesInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as { seriesName?: unknown; books?: unknown };
  if (typeof v.seriesName !== "string") return false;
  if (!Array.isArray(v.books)) return false;
  if (!v.books.every(isValidSeriesBook)) return false;
  return true;
}

let seriesCacheHydrated = false;

function hydrateSeriesCacheFromStorage(): void {
  if (seriesCacheHydrated) return;
  seriesCacheHydrated = true;
  const storage = getSeriesCacheStorage();
  if (!storage) return;
  let raw: string | null = null;
  try {
    raw = storage.getItem(SERIES_CACHE_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedCachePayload>;
    if (
      !parsed ||
      parsed.version !== SERIES_CACHE_STORAGE_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      try {
        storage.removeItem(SERIES_CACHE_STORAGE_KEY);
      } catch {}
      return;
    }
    const now = Date.now();
    for (const item of parsed.entries) {
      if (!Array.isArray(item) || item.length !== 2) continue;
      const [key, entry] = item;
      if (typeof key !== "string" || !entry || typeof entry !== "object") continue;
      const expiresAt =
        typeof (entry as SeriesCacheEntry).expiresAt === "number"
          ? (entry as SeriesCacheEntry).expiresAt
          : 0;
      if (expiresAt <= now) continue;
      const lastAccessedAt =
        typeof (entry as SeriesCacheEntry).lastAccessedAt === "number"
          ? (entry as SeriesCacheEntry).lastAccessedAt
          : 0;
      const rawValue = (entry as SeriesCacheEntry).value;
      let value: SeriesInfo | null;
      if (rawValue === null) {
        value = null;
      } else if (isValidSeriesInfo(rawValue)) {
        value = rawValue;
      } else {
        continue;
      }
      seriesInfoCache.set(key, { expiresAt, lastAccessedAt, value });
    }
    if (seriesInfoCache.size > SERIES_CACHE_MAX_ENTRIES) {
      evictSeriesCacheIfNeeded();
      persistSeriesCacheToStorage();
    }
  } catch {
    try {
      storage.removeItem(SERIES_CACHE_STORAGE_KEY);
    } catch {}
  }
}

function persistSeriesCacheToStorage(): void {
  const storage = getSeriesCacheStorage();
  if (!storage) return;
  try {
    const payload: PersistedCachePayload = {
      version: SERIES_CACHE_STORAGE_VERSION,
      entries: Array.from(seriesInfoCache.entries()),
    };
    storage.setItem(SERIES_CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota errors or similar — drop silently; the in-memory cache still works.
  }
}

function evictSeriesCacheIfNeeded(): void {
  if (seriesInfoCache.size <= SERIES_CACHE_MAX_ENTRIES) return;
  const sorted = Array.from(seriesInfoCache.entries()).sort(
    (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt,
  );
  const overflow = sorted.length - SERIES_CACHE_MAX_ENTRIES;
  for (let i = 0; i < overflow; i++) {
    seriesInfoCache.delete(sorted[i][0]);
  }
}

function normalizeWorkKey(workKey: string): string {
  return workKey.startsWith("/") ? workKey : `/${workKey}`;
}

export function clearSeriesInfoCache(): void {
  seriesInfoCache.clear();
  seriesInfoInFlight.clear();
  const storage = getSeriesCacheStorage();
  if (storage) {
    try {
      storage.removeItem(SERIES_CACHE_STORAGE_KEY);
    } catch {}
  }
}

export async function fetchSeriesInfo(
  workKey: string,
  signal?: AbortSignal,
): Promise<SeriesInfo | null> {
  hydrateSeriesCacheFromStorage();
  const key = normalizeWorkKey(workKey);

  const cached = seriesInfoCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    cached.lastAccessedAt = Date.now();
    persistSeriesCacheToStorage();
    return cached.value;
  }
  if (cached) {
    seriesInfoCache.delete(key);
    persistSeriesCacheToStorage();
  }

  const inFlight = seriesInfoInFlight.get(key);
  if (inFlight) {
    if (!signal) return inFlight;
    return new Promise<SeriesInfo | null>((resolve, reject) => {
      const onAbort = () => {
        const reason =
          (signal as AbortSignal & { reason?: unknown }).reason ??
          new DOMException("Aborted", "AbortError");
        reject(reason);
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      inFlight.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (err) => {
          signal.removeEventListener("abort", onAbort);
          reject(err);
        },
      );
    });
  }

  const promise = (async (): Promise<SeriesInfo | null> => {
    return await fetchSeriesInfoUncached(key, signal);
  })();

  seriesInfoInFlight.set(key, promise);

  try {
    const result = await promise;
    if (signal?.aborted) {
      const reason =
        (signal as AbortSignal & { reason?: unknown }).reason ??
        new DOMException("Aborted", "AbortError");
      throw reason;
    }
    const now = Date.now();
    seriesInfoCache.set(key, {
      value: result,
      expiresAt: now + SERIES_CACHE_TTL_MS,
      lastAccessedAt: now,
    });
    evictSeriesCacheIfNeeded();
    persistSeriesCacheToStorage();
    return result;
  } finally {
    if (seriesInfoInFlight.get(key) === promise) {
      seriesInfoInFlight.delete(key);
    }
  }
}

async function fetchSeriesInfoUncached(
  key: string,
  signal?: AbortSignal,
): Promise<SeriesInfo | null> {
  let workData: Record<string, unknown>;
  try {
    const workRes = await fetch(`${WORK_URL}${key}.json`, { signal });
    if (!workRes.ok) return null;
    workData = (await workRes.json()) as Record<string, unknown>;
  } catch {
    return null;
  }

  const workTitle = (workData.title as string) ?? "";
  const authors = workData.authors as Array<{ author?: { key?: string } }> | undefined;
  let authorName = "";
  if (authors && authors.length > 0 && authors[0]?.author?.key) {
    try {
      const authorRes = await fetch(`${WORK_URL}${authors[0].author.key}.json`, { signal });
      if (authorRes.ok) {
        const authorData = (await authorRes.json()) as { name?: string };
        authorName = authorData.name ?? "";
      }
    } catch {}
  }

  const titleLower = workTitle.toLowerCase().trim();

  const candidates: string[] = [];

  const editionsSeries = await tryEditionsSeries(key, signal);
  if (editionsSeries) candidates.push(editionsSeries);

  const subjectsSeries = trySubjectsAndLinks(workData);
  if (subjectsSeries) candidates.push(subjectsSeries);

  const searchSeries = await trySearchSeries(workTitle, authorName, signal);
  if (searchSeries) candidates.push(searchSeries);

  const preferred = candidates.find(
    (c) => c.toLowerCase().trim() !== titleLower,
  );
  const seriesName = preferred ?? candidates[0] ?? null;

  if (!seriesName) return null;

  const books = await fetchSeriesBooks(seriesName, authorName, signal);

  if (seriesName.toLowerCase().trim() === titleLower && books.length < 2) {
    return null;
  }

  return { seriesName, books };
}

let _testSearchAndFetchWorkUncachedCalls = 0;

async function searchAndFetchWorkUncached(
  title: string,
  author: string,
  signal?: AbortSignal,
): Promise<{ result: OpenLibrarySearchResult; details: OpenLibraryWorkDetails | null } | null> {
  _testSearchAndFetchWorkUncachedCalls++;
  const matches = await searchOpenLibrary(`${title} ${author}`, signal);
  const top =
    matches.find(
      (m) =>
        m.title.toLowerCase() === title.toLowerCase() &&
        m.author.toLowerCase().includes(author.split(" ").pop()?.toLowerCase() ?? ""),
    ) ?? matches[0];
  if (!top) return null;
  const details = await fetchWorkDetails(top.workKey, signal).catch(() => null);
  return { result: top, details };
}

const searchAndFetchWorkCache = createRequestCache<{
  result: OpenLibrarySearchResult;
  details: OpenLibraryWorkDetails | null;
} | null>({
  ttlMs: 24 * 60 * 60 * 1000,
  maxEntries: 100,
});

/**
 * Combined helper: search for a book by title+author, then fetch the top
 * match's work-level details. Returns null if no match.
 */
export async function searchAndFetchWork(
  title: string,
  author: string,
  signal?: AbortSignal,
): Promise<{ result: OpenLibrarySearchResult; details: OpenLibraryWorkDetails | null } | null> {
  const key = `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
  return cachedRequest(searchAndFetchWorkCache, key, signal, (s) =>
    searchAndFetchWorkUncached(title, author, s),
  );
}

interface RequestCacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
}

interface RequestCache<T> {
  ttlMs: number;
  maxEntries: number;
  cache: Map<string, RequestCacheEntry<T>>;
  inFlight: Map<string, Promise<T>>;
}

function createRequestCache<T>(opts: {
  ttlMs: number;
  maxEntries: number;
}): RequestCache<T> {
  return {
    ttlMs: opts.ttlMs,
    maxEntries: opts.maxEntries,
    cache: new Map(),
    inFlight: new Map(),
  };
}

function evictRequestCacheIfNeeded<T>(c: RequestCache<T>): void {
  if (c.cache.size <= c.maxEntries) return;
  const sorted = Array.from(c.cache.entries()).sort(
    (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt,
  );
  const overflow = sorted.length - c.maxEntries;
  for (let i = 0; i < overflow; i++) {
    c.cache.delete(sorted[i][0]);
  }
}

function abortReason(signal: AbortSignal): unknown {
  return (
    (signal as AbortSignal & { reason?: unknown }).reason ??
    new DOMException("Aborted", "AbortError")
  );
}

function waitForPromiseWithSignal<T>(
  p: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

async function cachedRequest<T>(
  c: RequestCache<T>,
  key: string,
  signal: AbortSignal | undefined,
  fetcher: (signal?: AbortSignal) => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = c.cache.get(key);
  if (cached && cached.expiresAt > now) {
    cached.lastAccessedAt = now;
    return cached.value;
  }
  if (cached) c.cache.delete(key);

  const inFlight = c.inFlight.get(key);
  if (inFlight) {
    if (!signal) return inFlight;
    return waitForPromiseWithSignal(inFlight, signal);
  }

  const promise = fetcher(signal);
  c.inFlight.set(key, promise);

  try {
    const result = await promise;
    if (signal?.aborted) {
      throw abortReason(signal);
    }
    const ts = Date.now();
    c.cache.set(key, {
      value: result,
      expiresAt: ts + c.ttlMs,
      lastAccessedAt: ts,
    });
    evictRequestCacheIfNeeded(c);
    return result;
  } finally {
    if (c.inFlight.get(key) === promise) {
      c.inFlight.delete(key);
    }
  }
}

/**
 * Test-only seam. Exposes counters and helpers needed to verify outer-cache
 * behavior of `searchAndFetchWork` independently of the nested helper caches
 * (`searchCache` and `workDetailsCache`). Not part of the public API — do not
 * use in production code.
 */
export const __testInternals = {
  resetCallCounts(): void {
    _testSearchAndFetchWorkUncachedCalls = 0;
  },
  getCallCounts(): { searchAndFetchWorkUncached: number } {
    return {
      searchAndFetchWorkUncached: _testSearchAndFetchWorkUncachedCalls,
    };
  },
  /**
   * Clears the inner caches and in-flight maps used by `searchOpenLibrary`
   * and `fetchWorkDetails`. Lets tests force the inner helpers to miss their
   * caches so any regression in the outer `searchAndFetchWork` cache surfaces
   * as additional network calls.
   */
  clearInnerHelperCaches(): void {
    searchCache.cache.clear();
    searchCache.inFlight.clear();
    workDetailsCache.cache.clear();
    workDetailsCache.inFlight.clear();
  },
};
