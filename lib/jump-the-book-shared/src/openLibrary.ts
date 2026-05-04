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

export async function searchOpenLibrary(
  query: string,
  signal?: AbortSignal,
): Promise<OpenLibrarySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
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

export async function fetchWorkDetails(
  workKey: string,
  signal?: AbortSignal,
): Promise<OpenLibraryWorkDetails | null> {
  const key = workKey.startsWith("/") ? workKey : `/${workKey}`;
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
  value: SeriesInfo | null;
}

const SERIES_CACHE_TTL_MS = 30 * 60 * 1000;
const seriesInfoCache = new Map<string, SeriesCacheEntry>();
const seriesInfoInFlight = new Map<string, Promise<SeriesInfo | null>>();

function normalizeWorkKey(workKey: string): string {
  return workKey.startsWith("/") ? workKey : `/${workKey}`;
}

export function clearSeriesInfoCache(): void {
  seriesInfoCache.clear();
  seriesInfoInFlight.clear();
}

export async function fetchSeriesInfo(
  workKey: string,
  signal?: AbortSignal,
): Promise<SeriesInfo | null> {
  const key = normalizeWorkKey(workKey);

  const cached = seriesInfoCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  if (cached) {
    seriesInfoCache.delete(key);
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
    seriesInfoCache.set(key, {
      value: result,
      expiresAt: Date.now() + SERIES_CACHE_TTL_MS,
    });
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

/**
 * Combined helper: search for a book by title+author, then fetch the top
 * match's work-level details. Returns null if no match.
 */
export async function searchAndFetchWork(
  title: string,
  author: string,
  signal?: AbortSignal,
): Promise<{ result: OpenLibrarySearchResult; details: OpenLibraryWorkDetails | null } | null> {
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
