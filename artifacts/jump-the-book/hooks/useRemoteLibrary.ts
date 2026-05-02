/**
 * Remote-backed library hooks for the mobile app.
 *
 * Mirrors the shape of `artifacts/jump-the-book-web/src/hooks/useApiLibrary.ts`
 * so that web and mobile speak the same /api/me/* API. We use `customFetch`
 * from the shared API client (which already prepends the API base URL and
 * attaches the Clerk bearer token via the getter installed in app/_layout.tsx),
 * paired with `useAuth` from `@clerk/expo` to gate queries on signed-in.
 *
 * Phase 2 of the web→mobile parity work. Phase 3 will add snap-page /
 * snap-cover, which will reuse `useIdentifyBookCover` from this file.
 */
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import type {
  AddBookInput,
  CoverIdentifyResult,
  RemoteBook,
  RemoteScene,
  RemoteUser,
} from "@workspace/jump-the-book-shared";

const API = "/api";

// ── Auth gate ───────────────────────────────────────────────────────────────
export function useIsSignedIn(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && !!isSignedIn;
}

// ── User profile ────────────────────────────────────────────────────────────
export function useRemoteUser() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me"],
    enabled,
    queryFn: () => customFetch<RemoteUser>(`${API}/me`),
  });
}

export function useUpdateRemoteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RemoteUser> & { markOnboarded?: boolean }) =>
      customFetch<RemoteUser>(`${API}/me`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });
}

// ── Books ────────────────────────────────────────────────────────────────────
export function useRemoteBooks() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me", "books"],
    enabled,
    queryFn: async () => {
      const r = await customFetch<{ books: RemoteBook[] }>(`${API}/me/books`);
      return r.books;
    },
  });
}

export function useAddRemoteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: AddBookInput) => {
      const r = await customFetch<{ book: RemoteBook }>(`${API}/me/books`, {
        method: "POST",
        body: JSON.stringify(book),
      });
      return r.book;
    },
    onSuccess: (created) => {
      // Seed the cache with the new book so screens that immediately
      // navigate to /experience/:id (where `id === created.id`) and look
      // up `userLibrary.find(b => b.id === id)` see the row right away —
      // no race against the background refetch. The server is the source
      // of truth and dedupes by (title, author), so reads of the *same*
      // book are idempotent and the invalidate just reconciles.
      qc.setQueryData<RemoteBook[]>(["me", "books"], (prev) => {
        if (!prev) return [created];
        if (prev.some((b) => b.id === created.id)) return prev;
        return [...prev, created];
      });
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

export function useDeleteRemoteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      customFetch<{ ok: true }>(`${API}/me/books/${id}`, { method: "DELETE" }),
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
      const r = await customFetch<{ book: RemoteBook }>(
        `${API}/me/books/${id}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      return r.book;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    },
  });
}

// ── Scenes ───────────────────────────────────────────────────────────────────
export function useRemoteSceneLibrary() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me", "scenes"],
    enabled,
    queryFn: async () => {
      const r = await customFetch<{ scenes: RemoteScene[] }>(`${API}/me/scenes`);
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
      const r = await customFetch<{ scenes: RemoteScene[] }>(
        `${API}/me/books/${userBookId}/scenes`,
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

export function useSaveRemoteScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userBookId, ...body }: SaveSceneInput) => {
      const r = await customFetch<{ scene: RemoteScene }>(
        `${API}/me/books/${userBookId}/scenes`,
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

// ── Orphan scenes (recovery flow) ────────────────────────────────────────────
//
// "Orphan" = scenes whose `userBookId` no longer maps to a real book in
// the user's library (typically because the book was deleted while
// scenes survived, or the device was reinstalled before sync).
// The user can either CLAIM them — which spins up a fresh book and
// re-points every matching scene at it — or FORGET them.
export interface OrphanGroup {
  userBookId: string;
  sceneCount: number;
  latestCreatedAt: string;
}

export function useOrphanScenes() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["me", "orphan-scenes"],
    enabled,
    queryFn: async () => {
      const r = await customFetch<{ groups: OrphanGroup[] }>(
        `${API}/me/orphan-scenes`,
      );
      return r.groups;
    },
  });
}

export interface ClaimOrphanInput {
  userBookId: string;
  title: string;
  author: string;
  visualStyle?: string;
  spoilerMode?: string;
  tagline?: string | null;
  heroImage?: string | null;
}

export function useClaimOrphanScenes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClaimOrphanInput) => {
      const r = await customFetch<{ book: RemoteBook; movedSceneCount: number }>(
        `${API}/me/orphan-scenes/claim`,
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
      const r = await customFetch<{ ok: true; removedSceneCount: number }>(
        `${API}/me/orphan-scenes/${userBookId}`,
        { method: "DELETE" },
      );
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "scenes"] });
      qc.invalidateQueries({ queryKey: ["me", "orphan-scenes"] });
    },
  });
}

// ── Cover identification (Phase 3 will wire the UI) ──────────────────────────
export function useIdentifyBookCover() {
  return useMutation({
    mutationFn: async (dataUrl: string) =>
      customFetch<CoverIdentifyResult>(`${API}/books/cover/identify`, {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      }),
  });
}
