import type { UserLibraryItem } from "@/data/books";
import type { ReadingSession, StreakData } from "@/lib/library";
import type { RemoteScene } from "@/hooks/useApiLibrary";

export interface ReadingStats {
  currentStreak: number;
  longestStreak: number;
  totalBooks: number;
  inProgress: number;
  finished: number;
  totalScenes: number;
  totalSessions: number;
  totalReadingMinutes: number;
}

export function deriveStats(input: {
  library: UserLibraryItem[];
  sessions: ReadingSession[];
  streak: StreakData;
  scenes?: RemoteScene[] | null;
}): ReadingStats {
  const { library, sessions, streak, scenes } = input;
  const finished = library.filter((b) => (b.progress ?? 0) >= 100).length;
  const inProgress = library.length - finished;
  const totalReadingMinutes = sessions.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0,
  );
  const localScenes = sessions.reduce((sum, s) => sum + (s.scenesUnlocked ?? 0), 0);
  // When `scenes` is provided (signed-in path), trust it as the source of truth —
  // even if empty. Only fall back to session-derived counts when scenes is null.
  const totalScenes = scenes != null ? scenes.length : localScenes;
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalBooks: library.length,
    inProgress,
    finished,
    totalScenes,
    totalSessions: streak.totalSessionsCount || sessions.length,
    totalReadingMinutes,
  };
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}
