/**
 * Mobile mirror of `artifacts/jump-the-book-web/src/hooks/useBookBible.ts`.
 *
 * Both apps target the same `/api/me/books/:id/bible` and
 * `/api/books/context/search` endpoints. The web hook uses its own
 * `apiFetch`; we reuse `customFetch` from the shared API client so the
 * Clerk-Expo token flows the same way the rest of the mobile app does.
 *
 * Types intentionally mirror `artifacts/api-server/src/routes/bibles.ts`.
 * If you change a field here, update the web hook in lockstep.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

import { useIsSignedIn } from "@/hooks/useRemoteLibrary";

const API = "/api";

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

export interface ContextSearchInput {
  title: string;
  author: string;
  series?: string;
  bookNumber?: number | null;
}

export function useGenerateBibleDraft() {
  return useMutation({
    mutationFn: (input: ContextSearchInput) =>
      customFetch<{ draft: BibleDraft }>(`${API}/books/context/search`, {
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
      customFetch<{ bible: SavedBible | null }>(
        `${API}/me/books/${encodeURIComponent(bookId!)}/bible`,
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
      customFetch<{ bible: SavedBible }>(
        `${API}/me/books/${encodeURIComponent(bookId)}/bible`,
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

/**
 * POST a passage page photo to /api/passage/ocr to extract the printed text.
 * Used by SnapPageButton to fill the excerpt textarea in Smart Setup.
 */
export function useSnapPageOcr() {
  return useMutation({
    mutationFn: (dataUrl: string) =>
      customFetch<{ text: string }>(`${API}/passage/ocr`, {
        method: "POST",
        body: JSON.stringify({ image: dataUrl }),
      }),
  });
}
