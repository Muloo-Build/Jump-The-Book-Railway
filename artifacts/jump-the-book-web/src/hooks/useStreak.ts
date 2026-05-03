import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { useIsSignedIn } from "@/hooks/useApiLibrary";

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
  lastActiveDate: string | null;
}

export function useStreak() {
  const enabled = useIsSignedIn();
  return useQuery({
    queryKey: ["streak"],
    enabled,
    queryFn: () => apiFetch<ReadingStreak>("/me/streak"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
