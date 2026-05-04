import { useQuery } from "@tanstack/react-query";

export interface TrendingBook {
  bookTitle: string;
  author: string;
  totalSceneHits: number;
  totalImageHits: number;
  totalHits: number;
  uniqueChapters: number;
  sceneCount: number;
  imageCount: number;
  sampleImages: string[];
  lastAccessedAt: string;
}

interface TrendingResponse {
  books: TrendingBook[];
  totalBooks: number;
}

export function useTrending() {
  return useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await fetch("/api/trending");
      if (!res.ok) throw new Error("Failed to fetch trending");
      return res.json() as Promise<TrendingResponse>;
    },
    staleTime: 60_000,
  });
}
