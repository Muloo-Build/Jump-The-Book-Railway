/**
 * Mobile LibraryContext — Phase 2 of web→mobile parity.
 *
 * Books are now persisted on the server via /api/me/books (Clerk-authenticated).
 * The Context still exposes the same API the rest of the app already consumes
 * (`userLibrary`, `addBook`, `removeBook`, `updateProgress`, `settings`,
 * `updateSettings`, plus local-only `streak/sessions/positions/activeBookId`),
 * so no consumer screens need to change. Internally:
 *
 *  - `userLibrary` is derived from `useRemoteBooks()` and mapped to the
 *    legacy `UserLibraryItem` shape via `remoteBookToUserLibraryItem`.
 *  - `addBook` POSTs to /api/me/books and returns the server UUID, which is
 *    the same id used in router URLs like /book/[id] and /experience/[id].
 *  - `removeBook` / `updateProgress` hit DELETE / PATCH on /api/me/books/:id.
 *  - Streak, sessions, positions, and active-book-id stay in AsyncStorage —
 *    they're local UX state, not part of the cross-device library, and a
 *    later phase will move them server-side if/when needed.
 *
 * The `<AuthGate>` in app/_layout.tsx guarantees this provider only mounts
 * its children once a Clerk session is available (or for the (auth) group).
 * Inside (auth), `useIsSignedIn()` returns false and the books query stays
 * disabled — the screens that use `userLibrary` are not in (auth) so they
 * never observe the brief signed-out state.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  remoteBookToUserLibraryItem,
  type SpoilerMode,
  type UserLibraryItem,
  type VisualStyle,
} from "@workspace/jump-the-book-shared";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAddRemoteBook,
  useDeleteRemoteBook,
  usePatchRemoteBook,
  useRemoteBooks,
} from "@/hooks/useRemoteLibrary";

// ─── Storage Keys (local-only state) ────────────────────────────────────────
const SETTINGS_KEY = "@jump_the_book_settings";
const ACTIVE_BOOK_KEY = "@jump_the_book_active";
const POSITIONS_KEY = "@jump_the_book_positions";
const SESSIONS_KEY = "@jump_the_book_sessions";
const STREAK_KEY = "@jump_the_book_streak";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BookPosition {
  bookId: string;
  bookFormat: "Kindle" | "Audible" | string;
  chapter: number;
  page: number;
  timestamp: string; // HH:MM:SS for audio
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

interface AppSettings {
  defaultVisualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
}

interface LibraryContextType {
  userLibrary: UserLibraryItem[];
  settings: AppSettings;
  activeBookId: string | null;
  positions: Record<string, BookPosition>;
  sessions: ReadingSession[];
  streak: StreakData;
  isLoading: boolean;

  addBook: (item: Omit<UserLibraryItem, "id" | "createdAt">) => Promise<string>;
  removeBook: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  setActiveBookId: (id: string | null) => void;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  updatePosition: (pos: Omit<BookPosition, "lastUpdated">) => Promise<void>;
  getPosition: (bookId: string) => BookPosition | null;
  startSession: (
    bookId: string,
    bookTitle: string,
    chapter: number,
  ) => Promise<string>;
  endSession: (
    sessionId: string,
    endChapter: number,
    scenesUnlocked: number,
  ) => Promise<void>;
  getActiveSession: (bookId: string) => ReadingSession | null;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
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

// ─── Context ─────────────────────────────────────────────────────────────────
const LibraryContext = createContext<LibraryContextType | null>(null);

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

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  // ── Remote-backed library ──────────────────────────────────────────────────
  const { data: remoteBooks, isPending: booksPending } = useRemoteBooks();
  const addRemote = useAddRemoteBook();
  const removeRemote = useDeleteRemoteBook();
  const patchRemote = usePatchRemoteBook();

  const userLibrary = useMemo<UserLibraryItem[]>(
    () => (remoteBooks ?? []).map(remoteBookToUserLibraryItem),
    [remoteBooks],
  );

  // ── Local-only state (settings, streak, sessions, positions, active) ──────
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeBookId, setActiveBookIdState] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, BookPosition>>({});
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [streak, setStreak] = useState<StreakData>(defaultStreak);
  const [localLoading, setLocalLoading] = useState(true);

  // Load all persisted local-only data on mount
  useEffect(() => {
    async function load() {
      try {
        const [settingsData, activeData, posData, sessData, streakData] =
          await Promise.all([
            AsyncStorage.getItem(SETTINGS_KEY),
            AsyncStorage.getItem(ACTIVE_BOOK_KEY),
            AsyncStorage.getItem(POSITIONS_KEY),
            AsyncStorage.getItem(SESSIONS_KEY),
            AsyncStorage.getItem(STREAK_KEY),
          ]);
        if (settingsData) setSettings(JSON.parse(settingsData));
        if (activeData) setActiveBookIdState(activeData);
        if (posData) setPositions(JSON.parse(posData));
        if (sessData) setSessions(JSON.parse(sessData));
        if (streakData) setStreak(JSON.parse(streakData));
      } catch {
        // ignore storage errors
      } finally {
        setLocalLoading(false);
      }
    }
    load();
  }, []);

  // We're "loading" until both the remote books query and local AsyncStorage
  // hydration have settled. `booksPending` stays true while the query is
  // disabled (signed-out), but children of <AuthGate> only mount once the
  // session is ready, so in practice this resolves quickly.
  const isLoading = localLoading || booksPending;

  // ── Library (remote) ──────────────────────────────────────────────────────
  const addBook = useCallback(
    async (
      item: Omit<UserLibraryItem, "id" | "createdAt">,
    ): Promise<string> => {
      const created = await addRemote.mutateAsync({
        title: item.title,
        author: item.author,
        format: item.format,
        source: item.sourceType === "demo" ? "demo" : "upload",
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
      });
      return created.id;
    },
    [addRemote],
  );

  const removeBook = useCallback(
    async (id: string) => {
      await removeRemote.mutateAsync(id);
    },
    [removeRemote],
  );

  const updateProgress = useCallback(
    async (id: string, progress: number) => {
      await patchRemote.mutateAsync({ id, progress });
    },
    [patchRemote],
  );

  // ── Active Book ──────────────────────────────────────────────────────────
  const setActiveBookId = useCallback((id: string | null) => {
    setActiveBookIdState(id);
    if (id) {
      AsyncStorage.setItem(ACTIVE_BOOK_KEY, id);
    } else {
      AsyncStorage.removeItem(ACTIVE_BOOK_KEY);
    }
  }, []);

  // ── Settings ─────────────────────────────────────────────────────────────
  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    },
    [settings],
  );

  // ── Positions ─────────────────────────────────────────────────────────────
  const updatePosition = useCallback(
    async (pos: Omit<BookPosition, "lastUpdated">) => {
      const updated = {
        ...positions,
        [pos.bookId]: { ...pos, lastUpdated: new Date().toISOString() },
      };
      setPositions(updated);
      await AsyncStorage.setItem(POSITIONS_KEY, JSON.stringify(updated));
    },
    [positions],
  );

  const getPosition = useCallback(
    (bookId: string): BookPosition | null => {
      return positions[bookId] ?? null;
    },
    [positions],
  );

  // ── Sessions ──────────────────────────────────────────────────────────────
  const startSession = useCallback(
    async (
      bookId: string,
      bookTitle: string,
      chapter: number,
    ): Promise<string> => {
      const id =
        "sess_" +
        Date.now().toString() +
        Math.random().toString(36).substr(2, 5);
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

      // Update streak on new session
      const newStreak = calcStreak(streak);
      setStreak(newStreak);
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));

      const updated = [session, ...sessions].slice(0, 50); // keep last 50
      setSessions(updated);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
      return id;
    },
    [sessions, streak],
  );

  const endSession = useCallback(
    async (sessionId: string, endChapter: number, scenesUnlocked: number) => {
      const updated = sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const startMs = new Date(s.startedAt).getTime();
        const durationMinutes = Math.round((Date.now() - startMs) / 60000);
        return {
          ...s,
          endedAt: new Date().toISOString(),
          endChapter,
          scenesUnlocked,
          durationMinutes,
        };
      });
      setSessions(updated);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
    },
    [sessions],
  );

  const getActiveSession = useCallback(
    (bookId: string): ReadingSession | null => {
      return sessions.find((s) => s.bookId === bookId && !s.endedAt) ?? null;
    },
    [sessions],
  );

  return (
    <LibraryContext.Provider
      value={{
        userLibrary,
        settings,
        activeBookId,
        positions,
        sessions,
        streak,
        isLoading,
        addBook,
        removeBook,
        updateProgress,
        setActiveBookId,
        updateSettings,
        updatePosition,
        getPosition,
        startSession,
        endSession,
        getActiveSession,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
