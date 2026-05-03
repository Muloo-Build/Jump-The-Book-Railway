import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";

export interface CompanionTurn {
  role: "user" | "assistant";
  content: string;
}

interface AskInput {
  bookId: string;
  question: string;
  history: CompanionTurn[];
}

export function useAskCompanion() {
  return useMutation({
    mutationFn: ({ bookId, question, history }: AskInput) =>
      apiFetch<{ answer: string }>(
        `/me/books/${encodeURIComponent(bookId)}/companion`,
        {
          method: "POST",
          body: JSON.stringify({ question, history }),
        },
      ),
  });
}
