// Reading-profile constants. The lists here power the chip pickers on the
// Account page. Keeping them as plain strings (instead of an enum) means
// users can also type their own custom tags — the server only enforces
// length/array limits, not membership.

export const GENRE_TAGS = [
  "Fantasy",
  "Sci-Fi",
  "Mystery",
  "Thriller",
  "Romance",
  "Horror",
  "Historical",
  "Literary",
  "Memoir",
  "Biography",
  "Self-Help",
  "Business",
  "Poetry",
  "Young Adult",
  "Classics",
  "Graphic Novel",
] as const;

export const PLATFORM_TAGS = [
  "Kindle",
  "Audible",
  "Apple Books",
  "Libby",
  "Spotify",
  "Paperback",
  "Hardcover",
  "Local library",
] as const;

export type ReadingPace = "slow" | "steady" | "voracious";

export const READING_PACE_LABELS: Record<ReadingPace, string> = {
  slow: "Slow & savouring",
  steady: "Steady reader",
  voracious: "Voracious",
};
