import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { apiFetch } from "@/lib/queryClient";
import type { SpoilerMode, VisualStyle } from "@/data/books";

export interface RemoteUser {
  userId: string;
  avatarId: string | null;
  defaultVisualStyle: VisualStyle;
  defaultVisualStyles: VisualStyle[];
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
  favoriteGenres: string[];
  readingPlatforms: string[];
  readingPace: "slow" | "steady" | "voracious" | null;
  aboutMe: string;
  /**
   * Per-user opt-in to share locally generated scene images with the
   * public Discover/trending feed. Defaults to false. Toggling controls
   * whether this user's contributions appear as `sampleImages` on
   * trending books.
   */
  shareToTrending: boolean;
  onboarded: boolean;
  onboardedAt: string | null;
}

export type ReadingStatus = "reading" | "want-to-read" | "finished";

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
  readingStatus: ReadingStatus;
  seriesName: string | null;
  seriesOrder: number | null;
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
    // Invalidate (refetch) instead of optimistically writing the response
    // into the cache. Two cards on the Account page can each fire debounced
    // PATCHes that overlap in flight; an out-of-order response could
    // otherwise overwrite the cache with another card's older snapshot and
    // visually revert their unsaved edits. A refetch always lands the
    // freshest server state. Callers that need an instant cache update
    // (e.g. the avatar picker, where the header should swap immediately)
    // can still `setQueryData` manually after `await mutateAsync(...)`.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
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
  readingStatus?: ReadingStatus;
  seriesName?: string | null;
  seriesOrder?: number | null;
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
    onSuccess: (_data, id) => {
      qc.setQueryData<RemoteBook[]>(["me", "books"], (prev) =>
        prev ? prev.filter((b) => b.id !== id) : [],
      );
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

/**
 * Wipe every book (and its cascading scenes) for the signed-in user. Powers
 * the "Reset library" danger action on the account page. We blow away both
 * the books and scene-library caches because deleting books cascades to
 * scenes and any cached scene rows would now be orphaned.
 */
export function useDeleteAllRemoteBooks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true; deleted: number }>(`/me/books`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "books"] });
      qc.invalidateQueries({ queryKey: ["me", "scenes"] });
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

export function useUpdateBookStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, readingStatus }: { id: string; readingStatus: ReadingStatus }) => {
      const r = await apiFetch<{ book: RemoteBook }>(`/me/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ readingStatus }),
      });
      return r.book;
    },
    onSuccess: (updated) => {
      qc.setQueryData<RemoteBook[]>(["me", "books"], (prev) =>
        prev ? prev.map((b) => (b.id === updated.id ? updated : b)) : [],
      );
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

export function useDeleteRemoteScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sceneId: string) => {
      const r = await apiFetch<{ ok: true; userBookId: string }>(
        `/me/scenes/${sceneId}`,
        { method: "DELETE" },
      );
      return r;
    },
    onSuccess: (data, sceneId) => {
      // Remove the scene immediately from both caches so the UI updates
      // without waiting for a refetch.
      qc.setQueryData<RemoteScene[]>(
        ["me", "books", data.userBookId, "scenes"],
        (prev) => (prev ? prev.filter((s) => s.id !== sceneId) : []),
      );
      qc.setQueryData<RemoteScene[]>(["me", "scenes"], (prev) =>
        prev ? prev.filter((s) => s.id !== sceneId) : [],
      );
      qc.invalidateQueries({
        queryKey: ["me", "books", data.userBookId, "scenes"],
      });
      qc.invalidateQueries({ queryKey: ["me", "scenes"] });
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
