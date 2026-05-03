import { Flame } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A tiny flame counter shown in the header next to the user menu. Hidden
 * entirely when the user has no active streak — we don't want to show
 * "0 days" as a guilt trip on day one.
 */
export default function StreakBadge() {
  const { data } = useStreak();
  if (!data || data.currentStreak === 0) return null;

  const { currentStreak, todayActive, longestStreak } = data;
  const lit = todayActive;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={
              "hidden sm:inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs font-mono uppercase tracking-wider transition-colors " +
              (lit
                ? "border-primary/50 bg-primary/15 text-[var(--jtb-accent-hi)]"
                : "border-border/50 bg-card/50 text-muted-foreground")
            }
            aria-label={`Reading streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"}`}
          >
            <Flame
              className={
                "w-3.5 h-3.5 " +
                (lit ? "fill-primary/40" : "")
              }
              aria-hidden
            />
            <span>{currentStreak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans">
          <div className="text-xs space-y-0.5">
            <div className="font-semibold">
              {currentStreak}-day reading streak
            </div>
            <div className="text-muted-foreground">
              {lit
                ? "You've kept it alive today."
                : "Generate a scene or update a book to keep the flame."}
            </div>
            {longestStreak > currentStreak && (
              <div className="text-muted-foreground">
                Personal best: {longestStreak} days
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
