import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useIsSignedIn } from "@/hooks/useApiLibrary";

// ─── Types (mirror server shape in artifacts/api-server/src/routes/bibles.ts)
export interface NamedEntity {
  name: string;
  description: string;
}

export interface CharacterProfile {
  name: string;
  role: string;
  description: string;
  visualTraits: string[];
  aliases: string[];
}

export interface SourceRef {
  title: string;
  url: string;
  type: string;
}

export interface BibleDraft {
  series: string | null;
  bookNumber: number | null;
  genre: string[];
  tone: string[];
  settingSummary: string;
  visualStyleHints: string[];
  nonSpoilerSummary: string;
  publisherBlurb: string;
  factions: NamedEntity[];
  locations: NamedEntity[];
  species: NamedEntity[];
  ships: NamedEntity[];
  technology: NamedEntity[];
  importantObjects: NamedEntity[];
  characterProfiles: CharacterProfile[];
  sources: SourceRef[];
}

export interface SavedBible extends BibleDraft {
  id: string;
  userBookId: string;
  contextVersion: number;
  userNotes: string;
  focusAreas: string[];
  avoidNotes: string;
  createdAt: string;
  updatedAt: string;
}

export const EMPTY_DRAFT: BibleDraft = {
  series: null,
  bookNumber: null,
  genre: [],
  tone: [],
  settingSummary: "",
  visualStyleHints: [],
  nonSpoilerSummary: "",
  publisherBlurb: "",
  factions: [],
  locations: [],
  species: [],
  ships: [],
  technology: [],
  importantObjects: [],
  characterProfiles: [],
  sources: [],
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

export interface ContextSearchInput {
  title: string;
  author: string;
  series?: string;
  bookNumber?: number | null;
}

export function useGenerateBibleDraft() {
  return useMutation({
    mutationFn: (input: ContextSearchInput) =>
      apiFetch<{ draft: BibleDraft }>("/books/context/search", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useBookBible(bookId: string | null | undefined) {
  const enabled = useIsSignedIn() && !!bookId;
  return useQuery({
    queryKey: ["bible", bookId],
    enabled,
    queryFn: () =>
      apiFetch<{ bible: SavedBible | null }>(
        `/me/books/${encodeURIComponent(bookId!)}/bible`,
      ),
  });
}

export interface SaveBibleInput {
  bookId: string;
  draft: BibleDraft;
  userNotes: string;
  focusAreas: string[];
  avoidNotes: string;
}

export function useSaveBookBible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, ...body }: SaveBibleInput) =>
      apiFetch<{ bible: SavedBible }>(
        `/me/books/${encodeURIComponent(bookId)}/bible`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (data, vars) => {
      qc.setQueryData(["bible", vars.bookId], { bible: data.bible });
    },
  });
}
