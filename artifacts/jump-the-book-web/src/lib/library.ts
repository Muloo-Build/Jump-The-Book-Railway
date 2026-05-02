import { useCallback, useEffect, useMemo, useState } from "react";
import type { SpoilerMode, UserLibraryItem, VisualStyle } from "@/data/books";

// ─── Storage Keys ───────────────────────────────────────────────────────────
const STORAGE_KEY = "@jump_the_book_library";
const SETTINGS_KEY = "@jump_the_book_settings";
const ACTIVE_BOOK_KEY = "@jump_the_book_active";
const POSITIONS_KEY = "@jump_the_book_positions";
const SESSIONS_KEY = "@jump_the_book_sessions";
const STREAK_KEY = "@jump_the_book_streak";

export interface BookPosition {
  bookId: string;
  bookFormat: string; // free-form format label e.g. "EPUB", "Paperback"
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

/**
 * Browser-native library hook (localStorage). Mirrors the mobile context API
 * one-to-one so screens can be written the same way on web.
 */
export function useLibrary() {
  const [userLibrary, setUserLibrary] = useState<UserLibraryItem[]>(() =>
    readJSON<UserLibraryItem[]>(STORAGE_KEY, []),
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
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

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setUserLibrary(readJSON(STORAGE_KEY, []));
      if (e.key === SETTINGS_KEY) setSettings(readJSON(SETTINGS_KEY, defaultSettings));
      if (e.key === ACTIVE_BOOK_KEY) setActiveBookIdState(localStorage.getItem(ACTIVE_BOOK_KEY));
      if (e.key === POSITIONS_KEY) setPositions(readJSON(POSITIONS_KEY, {}));
      if (e.key === SESSIONS_KEY) setSessions(readJSON(SESSIONS_KEY, []));
      if (e.key === STREAK_KEY) setStreak(readJSON(STREAK_KEY, defaultStreak));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addBook = useCallback(
    (item: Omit<UserLibraryItem, "id" | "createdAt">): string => {
      const newItem: UserLibraryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
        createdAt: new Date().toISOString(),
      };
      setUserLibrary((prev) => {
        const next = [...prev, newItem];
        writeJSON(STORAGE_KEY, next);
        return next;
      });
      return newItem.id;
    },
    [],
  );

  const removeBook = useCallback((id: string) => {
    setUserLibrary((prev) => {
      const next = prev.filter((b) => b.id !== id);
      writeJSON(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setUserLibrary((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, progress } : b));
      writeJSON(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setActiveBookId = useCallback((id: string | null) => {
    setActiveBookIdState(id);
    if (id) localStorage.setItem(ACTIVE_BOOK_KEY, id);
    else localStorage.removeItem(ACTIVE_BOOK_KEY);
  }, []);

  const updateSettings = useCallback((next: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      writeJSON(SETTINGS_KEY, merged);
      return merged;
    });
  }, []);

  const updatePosition = useCallback((pos: Omit<BookPosition, "lastUpdated">) => {
    setPositions((prev) => {
      const next = { ...prev, [pos.bookId]: { ...pos, lastUpdated: new Date().toISOString() } };
      writeJSON(POSITIONS_KEY, next);
      return next;
    });
  }, []);

  const getPosition = useCallback(
    (bookId: string): BookPosition | null => positions[bookId] ?? null,
    [positions],
  );

  const startSession = useCallback(
    (bookId: string, bookTitle: string, chapter: number): string => {
      const id = "sess_" + Date.now().toString() + Math.random().toString(36).slice(2, 7);
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
    }),
    [
      userLibrary,
      settings,
      activeBookId,
      positions,
      sessions,
      streak,
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
    ],
  );
}
