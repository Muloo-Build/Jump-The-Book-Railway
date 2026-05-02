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
