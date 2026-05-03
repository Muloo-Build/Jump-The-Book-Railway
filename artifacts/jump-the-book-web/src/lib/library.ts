import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import type { SpoilerMode, UserLibraryItem, VisualStyle } from "@/data/books";
import {
  useAddRemoteBook,
  useDeleteRemoteBook,
  useDeleteAllRemoteBooks,
  usePatchRemoteBook,
  useRemoteBooks,
  useRemoteUser,
  useUpdateRemoteUser,
  type RemoteBook,
} from "@/hooks/useApiLibrary";

// ─── Storage Keys ───────────────────────────────────────────────────────────
const STORAGE_KEY = "@jump_the_book_library";
const SETTINGS_KEY = "@jump_the_book_settings";
const ACTIVE_BOOK_KEY = "@jump_the_book_active";
const POSITIONS_KEY = "@jump_the_book_positions";
const SESSIONS_KEY = "@jump_the_book_sessions";
const STREAK_KEY = "@jump_the_book_streak";

export interface BookPosition {
  bookId: string;
  bookFormat: string;
  chapter: number;
  page: number;
  timestamp: string;
  percentComplete: number;
  lastUpdated: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  startedAt: string;
  endedAt: string | null;
  startChapter: number;
  endChapter: number | null;
  scenesUnlocked: number;
  durationMinutes: number | null;
}

export interface StreakData {
  currentStreak: number;
  lastReadDate: string | null;
  longestStreak: number;
  totalSessionsCount: number;
}

export interface AppSettings {
  defaultVisualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
}

const defaultSettings: AppSettings = {
  defaultVisualStyle: "fantasy-illustration",
  spoilerMode: "no-spoilers",
  readingMode: "reading",
};

const defaultStreak: StreakData = {
  currentStreak: 0,
  lastReadDate: null,
  longestStreak: 0,
  totalSessionsCount: 0,
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function calcStreak(prev: StreakData): StreakData {
  const today = todayStr();
  if (prev.lastReadDate === today) return prev;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];
  const newStreak = prev.lastReadDate === yStr ? prev.currentStreak + 1 : 1;
  return {
    currentStreak: newStreak,
    lastReadDate: today,
    longestStreak: Math.max(newStreak, prev.longestStreak),
    totalSessionsCount: prev.totalSessionsCount + 1,
  };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / storage errors are non-fatal */
  }
}

function remoteBookToItem(b: RemoteBook): UserLibraryItem & {
  remoteId: string;
  demoBookId?: string | null;
  source: "demo" | "upload" | "manual";
} {
  // For demo books, surface the demo id as the item id so URL routing
  // (`/book/alice`) still resolves locally. For uploads/manual, use the
  // backend UUID. Always keep `remoteId` for scene saves.
  const isDemo = b.source === "demo" && b.demoBookId;
  const id = isDemo ? b.demoBookId! : b.id;
  return {
    id,
    title: b.title,
    author: b.author,
    format: b.format,
    currentChapter: b.currentChapter,
    currentPage: b.currentPage,
    currentAudioTimestamp: b.currentAudioTimestamp,
    spoilerMode: b.spoilerMode,
    userNote: b.userNote,
    visualStyle: b.visualStyle,
    progress: b.progress,
    coverGradient: b.coverGradient,
    createdAt: b.createdAt,
    sourceType: b.source === "demo" ? "demo" : "user-added",
    tagline: b.tagline ?? undefined,
    heroImage: b.heroImage ?? undefined,
    coverUrl: b.coverUrl ?? null,
    remoteId: b.id,
    demoBookId: b.demoBookId,
    source: b.source,
  };
}

/**
 * Auth-aware library hook. Same surface for signed-in (backend-backed) and
 * signed-out (localStorage) users. When signed in, books and settings are
 * persisted server-side; sessions / streak / activeBook stay local since they
 * are per-device.
 */
export function useLibrary() {
  const { isSignedIn, isLoaded } = useUser();
  const signedIn = isLoaded && !!isSignedIn;

  // ── Local-only state (always mounted, used as fallback or for per-device prefs)
  const [localLibrary, setLocalLibrary] = useState<UserLibraryItem[]>(() =>
    readJSON<UserLibraryItem[]>(STORAGE_KEY, []),
  );
  const [localSettings, setLocalSettings] = useState<AppSettings>(() =>
    readJSON<AppSettings>(SETTINGS_KEY, defaultSettings),
  );
  const [activeBookId, setActiveBookIdState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_BOOK_KEY),
  );
  const [positions, setPositions] = useState<Record<string, BookPosition>>(() =>
    readJSON<Record<string, BookPosition>>(POSITIONS_KEY, {}),
  );
  const [sessions, setSessions] = useState<ReadingSession[]>(() =>
    readJSON<ReadingSession[]>(SESSIONS_KEY, []),
  );
  const [streak, setStreak] = useState<StreakData>(() =>
    readJSON<StreakData>(STREAK_KEY, defaultStreak),
  );

  // ── Remote queries (only fire when signed in)
  const remoteUser = useRemoteUser();
  const remoteBooks = useRemoteBooks();
  const updateRemoteUser = useUpdateRemoteUser();
  const addRemoteBook = useAddRemoteBook();
  const deleteRemoteBook = useDeleteRemoteBook();
  const deleteAllRemoteBooks = useDeleteAllRemoteBooks();
  const patchRemoteBook = usePatchRemoteBook();

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setLocalLibrary(readJSON(STORAGE_KEY, []));
      if (e.key === SETTINGS_KEY)
        setLocalSettings(readJSON(SETTINGS_KEY, defaultSettings));
      if (e.key === ACTIVE_BOOK_KEY)
        setActiveBookIdState(localStorage.getItem(ACTIVE_BOOK_KEY));
      if (e.key === POSITIONS_KEY) setPositions(readJSON(POSITIONS_KEY, {}));
      if (e.key === SESSIONS_KEY) setSessions(readJSON(SESSIONS_KEY, []));
      if (e.key === STREAK_KEY)
        setStreak(readJSON(STREAK_KEY, defaultStreak));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Resolved values ────────────────────────────────────────────────────────
  const userLibrary: UserLibraryItem[] = useMemo(() => {
    if (signedIn && remoteBooks.data)
      return remoteBooks.data.map(remoteBookToItem);
    return localLibrary;
  }, [signedIn, remoteBooks.data, localLibrary]);

  const settings: AppSettings = useMemo(() => {
    if (signedIn && remoteUser.data) {
      return {
        defaultVisualStyle: remoteUser.data.defaultVisualStyle,
        spoilerMode: remoteUser.data.spoilerMode,
        readingMode: remoteUser.data.readingMode,
      };
    }
    return localSettings;
  }, [signedIn, remoteUser.data, localSettings]);

  // Resolve a book.id (URL param) to the backend user_books.id (UUID),
  // creating the row if necessary. Returns null when signed out.
  const resolveRemoteBookId = useCallback(
    async (book: {
      id: string;
      title: string;
      author: string;
      format?: string;
      visualStyle: VisualStyle;
      spoilerMode?: SpoilerMode;
      coverGradient?: string[];
      tagline?: string;
      heroImage?: string;
      sourceType?: "demo" | "user-added" | "user-writing";
    }): Promise<string | null> => {
      if (!signedIn) return null;

      // First check the remote books cache
      const list = remoteBooks.data ?? [];
      const isDemo = book.sourceType === "demo" || book.sourceType === undefined;
      const matched = isDemo
        ? list.find((b) => b.demoBookId === book.id)
        : list.find((b) => b.id === book.id);
      if (matched) return matched.id;

      // Otherwise create
      const created = await addRemoteBook.mutateAsync({
        title: book.title,
        author: book.author,
        format: book.format ?? "Paperback",
        source: isDemo ? "demo" : "manual",
        demoBookId: isDemo ? book.id : null,
        coverGradient: book.coverGradient ?? [],
        visualStyle: book.visualStyle,
        spoilerMode: book.spoilerMode ?? settings.spoilerMode,
        tagline: book.tagline ?? null,
        heroImage: book.heroImage ?? null,
      });
      return created.id;
    },
    [signedIn, remoteBooks.data, addRemoteBook, settings.spoilerMode],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addBook = useCallback(
    async (
      item: Omit<UserLibraryItem, "id" | "createdAt">,
      options?: { source?: "upload" | "manual" },
    ): Promise<string> => {
      // Normalize whitespace so " Foo  " and "Foo" hit the same dedup key.
      const title = item.title.trim();
      const author = item.author.trim();
      const source = options?.source ?? "upload";
      if (signedIn) {
        // Server enforces dedup by (userId, lower(title), lower(author)) for
        // upload/manual sources, so re-saving the same book just returns its
        // existing id.
        const created = await addRemoteBook.mutateAsync({
          title,
          author,
          format: item.format,
          source,
          coverGradient: item.coverGradient,
          visualStyle: item.visualStyle,
          spoilerMode: item.spoilerMode,
          currentChapter: item.currentChapter,
          currentPage: item.currentPage,
          currentAudioTimestamp: item.currentAudioTimestamp,
          progress: item.progress,
          userNote: item.userNote,
          tagline: item.tagline ?? null,
          heroImage: item.heroImage ?? null,
          coverUrl: item.coverUrl ?? null,
        });
        return created.id;
      }
      // Local (signed-out) dedup: if we already have a row with the same
      // (lowered title, lowered author), reuse it instead of pushing another.
      const lowerT = title.toLowerCase();
      const lowerA = author.toLowerCase();
      const dup = localLibrary.find(
        (b) =>
          b.title.trim().toLowerCase() === lowerT &&
          b.author.trim().toLowerCase() === lowerA,
      );
      if (dup) return dup.id;
      const newItem: UserLibraryItem = {
        ...item,
        title,
        author,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
        createdAt: new Date().toISOString(),
      };
      setLocalLibrary((prev) => {
        const next = [...prev, newItem];
        writeJSON(STORAGE_KEY, next);
        return next;
      });
      return newItem.id;
    },
    [signedIn, addRemoteBook, localLibrary],
  );

  const removeBook = useCallback(
    (id: string) => {
      if (signedIn) {
        const list = remoteBooks.data ?? [];
        // Match by demoBookId for demo entries, else by remote uuid
        const remote =
          list.find((b) => b.demoBookId === id) ??
          list.find((b) => b.id === id);
        if (remote) deleteRemoteBook.mutate(remote.id);
        return;
      }
      setLocalLibrary((prev) => {
        const next = prev.filter((b) => b.id !== id);
        writeJSON(STORAGE_KEY, next);
        return next;
      });
    },
    [signedIn, remoteBooks.data, deleteRemoteBook],
  );

  /**
   * Wipe the entire library. Signed-in users hit the bulk-delete endpoint
   * (which cascades to scenes); signed-out users just clear localStorage
   * for books, positions, sessions and active book selection. Resolves with
   * the number of remote rows removed so the caller can show a toast.
   */
  const clearLibrary = useCallback(async (): Promise<number> => {
    if (signedIn) {
      const r = await deleteAllRemoteBooks.mutateAsync();
      return r.deleted;
    }
    const removed = localLibrary.length;
    setLocalLibrary([]);
    writeJSON(STORAGE_KEY, []);
    setPositions({});
    writeJSON(POSITIONS_KEY, {});
    setSessions([]);
    writeJSON(SESSIONS_KEY, []);
    setStreak(defaultStreak);
    writeJSON(STREAK_KEY, defaultStreak);
    setActiveBookIdState(null);
    if (typeof window !== "undefined") localStorage.removeItem(ACTIVE_BOOK_KEY);
    return removed;
  }, [signedIn, deleteAllRemoteBooks, localLibrary.length]);

  const updateProgress = useCallback(
    (id: string, progress: number) => {
      if (signedIn) {
        const list = remoteBooks.data ?? [];
        const remote =
          list.find((b) => b.demoBookId === id) ??
          list.find((b) => b.id === id);
        if (remote) patchRemoteBook.mutate({ id: remote.id, progress });
        return;
      }
      setLocalLibrary((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, progress } : b));
        writeJSON(STORAGE_KEY, next);
        return next;
      });
    },
    [signedIn, remoteBooks.data, patchRemoteBook],
  );

  const setActiveBookId = useCallback((id: string | null) => {
    setActiveBookIdState(id);
    if (id) localStorage.setItem(ACTIVE_BOOK_KEY, id);
    else localStorage.removeItem(ACTIVE_BOOK_KEY);
  }, []);

  const updateSettings = useCallback(
    (next: Partial<AppSettings>) => {
      if (signedIn) {
        updateRemoteUser.mutate(next);
        return;
      }
      setLocalSettings((prev) => {
        const merged = { ...prev, ...next };
        writeJSON(SETTINGS_KEY, merged);
        return merged;
      });
    },
    [signedIn, updateRemoteUser],
  );

  const updatePosition = useCallback(
    (pos: Omit<BookPosition, "lastUpdated">) => {
      setPositions((prev) => {
        const next = {
          ...prev,
          [pos.bookId]: { ...pos, lastUpdated: new Date().toISOString() },
        };
        writeJSON(POSITIONS_KEY, next);
        return next;
      });
      if (signedIn) {
        const list = remoteBooks.data ?? [];
        const remote =
          list.find((b) => b.demoBookId === pos.bookId) ??
          list.find((b) => b.id === pos.bookId);
        if (remote) {
          patchRemoteBook.mutate({
            id: remote.id,
            currentChapter: pos.chapter,
            currentPage: pos.page,
            progress: pos.percentComplete,
          });
        }
      }
    },
    [signedIn, remoteBooks.data, patchRemoteBook],
  );

  const getPosition = useCallback(
    (bookId: string): BookPosition | null => positions[bookId] ?? null,
    [positions],
  );

  const startSession = useCallback(
    (bookId: string, bookTitle: string, chapter: number): string => {
      const id =
        "sess_" + Date.now().toString() + Math.random().toString(36).slice(2, 7);
      const session: ReadingSession = {
        id,
        bookId,
        bookTitle,
        startedAt: new Date().toISOString(),
        endedAt: null,
        startChapter: chapter,
        endChapter: null,
        scenesUnlocked: 0,
        durationMinutes: null,
      };
      setStreak((prev) => {
        const next = calcStreak(prev);
        writeJSON(STREAK_KEY, next);
        return next;
      });
      setSessions((prev) => {
        const next = [session, ...prev].slice(0, 50);
        writeJSON(SESSIONS_KEY, next);
        return next;
      });
      return id;
    },
    [],
  );

  const endSession = useCallback(
    (sessionId: string, endChapter: number, scenesUnlocked: number) => {
      setSessions((prev) => {
        const next = prev.map((s) => {
          if (s.id !== sessionId) return s;
          const startMs = new Date(s.startedAt).getTime();
          return {
            ...s,
            endedAt: new Date().toISOString(),
            endChapter,
            scenesUnlocked,
            durationMinutes: Math.round((Date.now() - startMs) / 60000),
          };
        });
        writeJSON(SESSIONS_KEY, next);
        return next;
      });
    },
    [],
  );

  const getActiveSession = useCallback(
    (bookId: string): ReadingSession | null =>
      sessions.find((s) => s.bookId === bookId && !s.endedAt) ?? null,
    [sessions],
  );

  return useMemo(
    () => ({
      userLibrary,
      settings,
      activeBookId,
      positions,
      sessions,
      streak,
      isSignedIn: signedIn,
      isOnboarded: signedIn ? !!remoteUser.data?.onboarded : true,
      isUserLoaded: isLoaded,
      addBook,
      removeBook,
      clearLibrary,
      updateProgress,
      setActiveBookId,
      updateSettings,
      updatePosition,
      getPosition,
      startSession,
      endSession,
      getActiveSession,
      resolveRemoteBookId,
    }),
    [
      userLibrary,
      settings,
      activeBookId,
      positions,
      sessions,
      streak,
      signedIn,
      isLoaded,
      remoteUser.data?.onboarded,
      addBook,
      removeBook,
      clearLibrary,
      updateProgress,
      setActiveBookId,
      updateSettings,
      updatePosition,
      getPosition,
      startSession,
      endSession,
      getActiveSession,
      resolveRemoteBookId,
    ],
  );
}
