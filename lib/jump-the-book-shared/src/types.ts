// Domain types shared between web and mobile apps.

export type VisualStyle =
  | "comic-book"
  | "watercolour"
  | "dark-cinematic"
  | "animated-storybook"
  | "manga-inspired"
  | "fantasy-illustration";

export const VISUAL_STYLE_LABELS: Record<VisualStyle, string> = {
  "comic-book": "Comic Book",
  watercolour: "Watercolour",
  "dark-cinematic": "Dark Cinematic",
  "animated-storybook": "Animated Storybook",
  "manga-inspired": "Manga Inspired",
  "fantasy-illustration": "Fantasy Illustration",
};

export type SpoilerMode = "no-spoilers" | "light-guidance" | "full-companion";

export const SPOILER_MODE_LABELS: Record<SpoilerMode, string> = {
  "no-spoilers": "No Spoilers",
  "light-guidance": "Light Guidance",
  "full-companion": "Full Chapter Companion",
};

/**
 * A book in a user's personal library — used by both the web library
 * page and the mobile library tab. Persisted on the server via
 * /api/me/books for signed-in users.
 */
export interface UserLibraryItem {
  id: string;
  title: string;
  author: string;
  format: string;
  currentChapter: number;
  currentPage: number;
  currentAudioTimestamp: string;
  spoilerMode: SpoilerMode;
  userNote: string;
  visualStyle: VisualStyle;
  progress: number;
  coverGradient: string[];
  createdAt: string;
  // Optional fields shared with demo Book so screens can render either uniformly
  sourceType?: "demo" | "user-added" | "user-writing";
  tagline?: string;
  heroImage?: string;
  // Backend user_books.id (UUID). Present for remote-backed items (signed-in
  // users); local/demo items use slug ids and have no remote id yet.
  remoteId?: string;
}

/**
 * Response shape from POST /api/books/cover/identify — the vision endpoint
 * that turns a phone photo of a book cover into title/author candidates.
 */
export interface CoverIdentifyResult {
  /** "found" → confident match. "uncertain" → low-confidence guess. "no-cover" → image isn't a book cover. */
  status: "found" | "uncertain" | "no-cover";
  title: string | null;
  author: string | null;
  notes?: string | null;
}

// ─── Remote (server-backed) library types ─────────────────────────────────────
// These match exactly what /api/me/* returns. Kept in shared so the web and
// mobile apps consume identical shapes; helper hooks differ only because of
// Clerk react vs expo SDK split.

export interface RemoteUser {
  userId: string;
  defaultVisualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
  onboarded: boolean;
  onboardedAt: string | null;
}

export interface RemoteBook {
  id: string;
  title: string;
  author: string;
  format: string;
  source: "demo" | "upload" | "manual";
  demoBookId: string | null;
  coverGradient: string[];
  visualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  currentChapter: number;
  currentPage: number;
  currentAudioTimestamp: string;
  progress: number;
  userNote: string;
  tagline: string | null;
  heroImage: string | null;
  totalChapters: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteScene {
  id: string;
  userBookId: string;
  chapterNumber: number;
  sceneIndex: number;
  title: string;
  summary: string | null;
  narration: string | null;
  location: string | null;
  mood: string | null;
  characters: string[];
  gradientColors: string[];
  imagePrompt: string | null;
  imageUrl: string | null;
  visualStyle: string | null;
  createdAt: string;
}

export interface AddBookInput {
  title: string;
  author: string;
  format?: string;
  source: "demo" | "upload" | "manual";
  demoBookId?: string | null;
  coverGradient?: string[];
  visualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  currentChapter?: number;
  currentPage?: number;
  currentAudioTimestamp?: string;
  progress?: number;
  userNote?: string;
  tagline?: string | null;
  heroImage?: string | null;
  totalChapters?: number | null;
}

/**
 * Map a server RemoteBook to the legacy UserLibraryItem shape so existing
 * screens that read `userLibrary` keep working unchanged. The remote UUID
 * becomes the canonical `id` (used in router URLs like /book/[id]).
 */
export function remoteBookToUserLibraryItem(r: RemoteBook): UserLibraryItem {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    format: r.format,
    currentChapter: r.currentChapter,
    currentPage: r.currentPage,
    currentAudioTimestamp: r.currentAudioTimestamp,
    spoilerMode: r.spoilerMode,
    userNote: r.userNote,
    visualStyle: r.visualStyle,
    progress: r.progress,
    coverGradient: r.coverGradient,
    createdAt: r.createdAt,
    sourceType: r.source === "demo" ? "demo" : "user-added",
    tagline: r.tagline ?? undefined,
    heroImage: r.heroImage ?? undefined,
    remoteId: r.id,
  };
}
