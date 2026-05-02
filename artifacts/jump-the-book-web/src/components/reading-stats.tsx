import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, BookOpen, BookCheck, Sparkles, Clock, TrendingUp } from "lucide-react";
import { useLibrary } from "@/lib/library";
import { useRemoteSceneLibrary } from "@/hooks/useApiLibrary";
import { deriveStats, formatReadingTime } from "@/lib/stats";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  delay?: number;
}

function StatCard({ icon, label, value, hint, accent = "text-primary", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-xl border border-border/40 bg-card/40 p-4 md:p-5 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <span className={`${accent} flex-shrink-0`}>{icon}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div className="font-serif text-2xl md:text-3xl font-bold leading-none">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-muted-foreground/80 leading-tight">
          {hint}
        </div>
      )}
    </motion.div>
  );
}

export default function ReadingStats() {
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

  const empty =
    stats.totalBooks === 0 &&
    stats.totalSessions === 0 &&
    stats.totalScenes === 0;

  if (empty) return null;

  return (
    <section aria-label="Reading stats" className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="font-serif text-2xl font-semibold">Your reading</h2>
        {stats.currentStreak > 0 && (
          <span className="text-sm text-amber-300/90 font-medium flex items-center gap-1.5">
            <Flame className="w-4 h-4" />
            {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"} in a row
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          label="Current streak"
          value={stats.currentStreak}
          hint={
            stats.longestStreak > stats.currentStreak
              ? `Best: ${stats.longestStreak}`
              : "Keep it going"
          }
          accent="text-amber-400"
          delay={0}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Longest streak"
          value={stats.longestStreak}
          hint="days in a row"
          accent="text-amber-300"
          delay={0.05}
        />
        <StatCard
          icon={<BookOpen className="w-4 h-4" />}
          label="In progress"
          value={stats.inProgress}
          hint={`${stats.totalBooks} in library`}
          accent="text-primary"
          delay={0.1}
        />
        <StatCard
          icon={<BookCheck className="w-4 h-4" />}
          label="Finished"
          value={stats.finished}
          hint={
            stats.finished === 0 ? "No books finished yet" : "books complete"
          }
          accent="text-emerald-400"
          delay={0.15}
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4" />}
          label="Scenes made"
          value={stats.totalScenes}
          hint="cinematic moments"
          accent="text-violet-300"
          delay={0.2}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Time read"
          value={formatReadingTime(stats.totalReadingMinutes)}
          hint={`${stats.totalSessions} session${stats.totalSessions === 1 ? "" : "s"}`}
          accent="text-sky-300"
          delay={0.25}
        />
      </div>
    </section>
  );
}
