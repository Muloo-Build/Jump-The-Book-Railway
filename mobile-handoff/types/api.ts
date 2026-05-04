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
  // Resolved cover URL (Open Library or any CDN). When present, the tile
  // renders this directly and skips the per-browser OL lookup.
  coverUrl?: string | null;
  remoteId?: string;
  readingStatus?: "reading" | "want-to-read" | "finished";
  seriesName?: string | null;
  seriesOrder?: number | null;
}

/**
 * Response from `POST /api/books/cover/identify`.
 *
 * The endpoint 422s when the model can't make out title+author, so any
 * `200` payload reaching the client has non-empty trimmed strings.
 * `confidence` is the model's self-reported 0..1 score; below ~0.55 the
 * UI should warn the user the read may be off.
 */
export interface CoverIdentifyResult {
  title: string;
  author: string;
  confidence: number;
  note?: string;
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
  coverUrl: string | null;
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
  coverUrl?: string | null;
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
    coverUrl: r.coverUrl ?? null,
    remoteId: r.id,
  };
}
