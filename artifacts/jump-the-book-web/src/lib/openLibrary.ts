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

