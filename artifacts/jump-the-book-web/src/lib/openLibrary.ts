export interface OpenLibrarySearchResult {
  key: string;
  title: string;
  author: string;
  firstPublishYear: number | null;
  pageCount: number | null;
  coverUrl: string | null;
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
    }))
    .slice(0, 12);
}
