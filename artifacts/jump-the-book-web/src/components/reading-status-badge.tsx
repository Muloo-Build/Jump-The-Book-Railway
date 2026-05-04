import { useState } from "react";
import { BookOpen, BookMarked, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUpdateBookStatus,
  type ReadingStatus,
} from "@/hooks/useApiLibrary";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ReadingStatus,
  { label: string; icon: typeof BookOpen; color: string; bg: string }
> = {
  reading: {
    label: "Reading",
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-500/20 border-blue-500/30",
  },
  "want-to-read": {
    label: "Want to Read",
    icon: BookMarked,
    color: "text-amber-400",
    bg: "bg-amber-500/20 border-amber-500/30",
  },
  finished: {
    label: "Finished",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20 border-emerald-500/30",
  },
};

interface Props {
  bookId: string;
  currentStatus: ReadingStatus;
  compact?: boolean;
}

export default function ReadingStatusBadge({
  bookId,
  currentStatus,
  compact = false,
}: Props) {
  const updateStatus = useUpdateBookStatus();
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.reading;
  const Icon = config.icon;

  const handleSelect = (status: ReadingStatus) => {
    if (status !== currentStatus) {
      updateStatus.mutate({ id: bookId, readingStatus: status });
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border text-[10px] font-medium px-2 py-0.5 transition-colors hover:brightness-125",
            config.bg,
            config.color,
          )}
        >
          <Icon className="w-3 h-3" />
          {!compact && config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-44"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map((status) => {
          const s = STATUS_CONFIG[status];
          const SIcon = s.icon;
          return (
            <DropdownMenuItem
              key={status}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(status);
              }}
              className={cn(
                "cursor-pointer",
                status === currentStatus && "font-semibold",
              )}
            >
              <SIcon className={cn("w-4 h-4 mr-2", s.color)} />
              {s.label}
              {status === currentStatus && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { STATUS_CONFIG };
