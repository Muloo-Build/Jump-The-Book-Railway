import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { apiFetch } from "@/lib/queryClient";
import type { SpoilerMode, VisualStyle } from "@/data/books";

export interface RemoteUser {
  userId: string;
  defaultVisualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
  onboarded: boolean;
  onboardedAt: string | null;
}

export interface RemoteBook {
  id: string;
  title: string;
  author: string;
  format: string;
  source: "demo" | "upload" | "manual";
  demoBookId: string | null;
  coverGradient: string[];
  visualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  currentChapter: number;
  currentPage: number;
  currentAudioTimestamp: string;
  progress: number;
  userNote: string;
  tagline: string | null;
  heroImage: string | null;
  coverUrl: string | null;
  totalChapters: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteScene {
  id: string;
  userBookId: string;
  chapterNumber: number;
  sceneIndex: number;
  title: string;
  summary: string | null;
  narration: string | null;
  location: string | null;
  mood: string | null;
  characters: string[];
  gradientColors: string[];
  imagePrompt: string | null;
  imageUrl: string | null;
  visualStyle: string | null;
  createdAt: string;
}

export function useIsSignedIn(): boolean {
  const { isSignedIn, isLoaded } = useUser();
  return isLoaded && !!isSignedIn;
}

export function useRemoteUser() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me"],
    enabled,
    queryFn: () => apiFetch<RemoteUser>("/me"),
  });
}

export function useUpdateRemoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RemoteUser> & { markOnboarded?: boolean }) =>
      apiFetch<RemoteUser>("/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });
}

export function useRemoteBooks() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me", "books"],
    enabled,
    queryFn: async () => {
      const r = await apiFetch<{ books: RemoteBook[] }>("/me/books");
      return r.books;
    },
  });
}

export interface AddBookInput {
  title: string;
  author: string;
  format?: string;
  source: "demo" | "upload" | "manual";
  demoBookId?: string | null;
  coverGradient?: string[];
  visualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  currentChapter?: number;
  currentPage?: number;
  currentAudioTimestamp?: string;
  progress?: number;
  userNote?: string;
  tagline?: string | null;
  heroImage?: string | null;
  coverUrl?: string | null;
  totalChapters?: number | null;
}

export function useAddRemoteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: AddBookInput) => {
      const r = await apiFetch<{ book: RemoteBook }>("/me/books", {
        method: "POST",
        body: JSON.stringify(book),
      });
      return r.book;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

export function useDeleteRemoteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/me/books/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

export function usePatchRemoteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Partial<AddBookInput>) => {
      const r = await apiFetch<{ book: RemoteBook }>(`/me/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return r.book;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

export function useRemoteSceneLibrary() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me", "scenes"],
    enabled,
    queryFn: async () => {
      const r = await apiFetch<{ scenes: RemoteScene[] }>("/me/scenes");
      return r.scenes;
    },
  });
}

export function useRemoteBookScenes(userBookId: string | null | undefined) {
  const enabled = useIsSignedIn() && !!userBookId;
  return useQuery({
    queryKey: ["me", "books", userBookId, "scenes"],
    enabled,
    queryFn: async () => {
      const r = await apiFetch<{ scenes: RemoteScene[] }>(
        `/me/books/${userBookId}/scenes`,
      );
      return r.scenes;
    },
  });
}

export interface SaveSceneInput {
  userBookId: string;
  chapterNumber: number;
  sceneIndex: number;
  title: string;
  summary?: string;
  narration?: string;
  location?: string;
  mood?: string;
  characters?: string[];
  gradientColors?: string[];
  imagePrompt?: string;
  imageUrl?: string | null;
  visualStyle?: string;
  sceneCacheKey?: string | null;
  imageCacheKey?: string | null;
}

// ── Cover identification ─────────────────────────────────────────────────────
// "Snap a cover" sends a phone photo to the server's vision endpoint, which
// returns the model's best read of (title, author, confidence). The client
// then runs that through Open Library to find candidate matches.

export interface CoverIdentifyResult {
  title: string;
  author: string;
  confidence: number;
  note?: string;
}

export function useIdentifyBookCover() {
  return useMutation({
    mutationFn: async (dataUrl: string) => {
      return await apiFetch<CoverIdentifyResult>("/books/cover/identify", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
    },
  });
}

// ── Orphan scene recovery ────────────────────────────────────────────────────
// "Orphan" scenes belong to a user_book_id that no longer has a row in
// user_books for the current user. The client surfaces them as an "Unknown
// book" group that the user can either claim (turn into a real book row) or
// forget.

export interface OrphanGroup {
  userBookId: string;
  sceneCount: number;
  latestCreatedAt: string;
}

export function useOrphanSceneGroups() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me", "orphan-scenes"],
    enabled,
    queryFn: async () => {
      const r = await apiFetch<{ groups: OrphanGroup[] }>("/me/orphan-scenes");
      return r.groups;
    },
  });
}

export interface ClaimOrphanInput {
  userBookId: string;
  title: string;
  author: string;
  visualStyle?: VisualStyle;
  spoilerMode?: SpoilerMode;
  tagline?: string | null;
  heroImage?: string | null;
}

export function useClaimOrphanScenes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClaimOrphanInput) => {
      const r = await apiFetch<{ book: RemoteBook; movedSceneCount: number }>(
        "/me/orphan-scenes/claim",
        { method: "POST", body: JSON.stringify(input) },
      );
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "books"] });
      qc.invalidateQueries({ queryKey: ["me", "scenes"] });
      qc.invalidateQueries({ queryKey: ["me", "orphan-scenes"] });
    },
  });
}

export function useDeleteOrphanScenes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userBookId: string) => {
      const r = await apiFetch<{ ok: true; removedSceneCount: number }>(
        `/me/orphan-scenes/${userBookId}`,
        { method: "DELETE" },
      );
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "scenes"] });
      qc.invalidateQueries({ queryKey: ["me", "orphan-scenes"] });
      // Also refresh the books list — if the client's orphan classification
      // disagreed with the server (stale book list), this re-syncs it so
      // any "Unknown book" group that should have been a real book row
      // disappears from the UI on the next render.
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

export function useSaveRemoteScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userBookId, ...body }: SaveSceneInput) => {
      const r = await apiFetch<{ scene: RemoteScene }>(
        `/me/books/${userBookId}/scenes`,
        { method: "POST", body: JSON.stringify(body) },
      );
      return r.scene;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["me", "books", vars.userBookId, "scenes"],
      });
      qc.invalidateQueries({ queryKey: ["me", "scenes"] });
    },
  });
}
