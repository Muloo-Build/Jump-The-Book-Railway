import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLibrary } from "@/lib/library";
import { useRemoteSceneLibrary } from "@/hooks/useApiLibrary";
import { deriveStats, formatReadingTime } from "@/lib/stats";
import type { UserLibraryItem } from "@/data/books";

interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  delay?: number;
}

function Stat({ label, value, hint, delay = 0 }: StatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="px-5 py-4 first:pl-0 last:pr-0 md:border-r md:border-border/40 md:last:border-r-0 flex flex-col gap-1.5"
    >
      <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/70 font-medium">
        {label}
      </div>
      <div className="font-serif text-3xl md:text-4xl leading-none">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-muted-foreground/70 leading-tight truncate">
          {hint}
        </div>
      )}
    </motion.div>
  );
}

interface Props {
  /** Optional: the currently-reading book, so the first stat can name it. */
  nowReading?: UserLibraryItem | null;
}

export default function ReadingStats({ nowReading }: Props = {}) {
  const { userLibrary, sessions, streak, isSignedIn } = useLibrary();
  const sceneLib = useRemoteSceneLibrary();

  const stats = useMemo(
    () =>
      deriveStats({
        library: userLibrary,
        sessions,
        streak,
        scenes: isSignedIn ? sceneLib.data : null,
      }),
    [userLibrary, sessions, streak, isSignedIn, sceneLib.data],
  );

  // Hide the strip only when the user genuinely has nothing on their shelf.
  // A user who has just added their first book (zero sessions, zero scenes)
  // should still see the row — otherwise the page feels suddenly emptier
  // after the very first add.
  if (stats.totalBooks === 0) return null;

  // Crude "this week" / "this month" qualifiers. The full stats engine
  // doesn't surface time-bucketed counts yet — these read as the right
  // hint copy for the magazine layout without inventing fake numbers.
  const scenesHint =
    stats.totalScenes > 0
      ? stats.totalScenes === 1
        ? "your first scene"
        : "cinematic moments"
      : "none yet";

  return (
    <section
      aria-label="Reading stats"
      className="rounded-xl border border-border/40 bg-card/30 grid grid-cols-2 md:grid-cols-5 divide-y divide-border/40 md:divide-y-0"
    >
      <Stat
        label="Currently reading"
        value={stats.inProgress}
        hint={
          nowReading
            ? nowReading.title
            : stats.inProgress === 0
              ? "—"
              : `${stats.inProgress} in progress`
        }
        delay={0}
      />
      <Stat
        label="In library"
        value={stats.totalBooks}
        hint={
          stats.finished > 0
            ? `${stats.finished} finished`
            : `${stats.totalBooks - stats.inProgress} on the shelf`
        }
        delay={0.05}
      />
      <Stat
        label="Scenes generated"
        value={stats.totalScenes}
        hint={scenesHint}
        delay={0.1}
      />
      <Stat
        label="Streak"
        value={stats.currentStreak}
        hint={
          stats.longestStreak > stats.currentStreak
            ? `best ${stats.longestStreak}`
            : "days in a row"
        }
        delay={0.15}
      />
      <Stat
        label="Time read"
        value={formatReadingTime(stats.totalReadingMinutes)}
        hint={`${stats.totalSessions} session${stats.totalSessions === 1 ? "" : "s"}`}
        delay={0.2}
      />
    </section>
  );
}
