// Bunny avatar gallery. Files live in `public/avatars/` so they're served as
// static assets at `${BASE_URL}avatars/bunny-<id>.png`. Adding a new bunny
// is a four-step change: drop the PNG into public/avatars/, add an entry
// here, add the id to the `AVATAR_IDS` set in the API's `me.ts`, and
// optionally to the GENRE_TAGS in `data/profile.ts` if it implies a genre.

export type AvatarId =
  | "cute"
  | "whimsical"
  | "geometric"
  | "scifi"
  | "fantasy"
  | "pixel"
  | "comic"
  | "watercolor"
  | "gothic"
  | "cosmic";

export interface AvatarOption {
  id: AvatarId;
  name: string;
  blurb: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "cute", name: "Cute", blurb: "Soft, kawaii, big-eyed cuddly bunny." },
  { id: "whimsical", name: "Whimsical", blurb: "Watercolour storybook bunny with a tiny golden book." },
  { id: "geometric", name: "Geometric", blurb: "Clean, modern, flat-design vector bunny." },
  { id: "scifi", name: "Sci-Fi", blurb: "Cyberpunk bunny with chrome helmet and neon trim." },
  { id: "fantasy", name: "Fantasy", blurb: "Mystical wizard-hatted bunny with glowing runes." },
  { id: "pixel", name: "Pixel", blurb: "Retro 16-bit pixel-art bunny sprite." },
  { id: "comic", name: "Comic Book", blurb: "Bold ink-line halftone superhero bunny." },
  { id: "watercolor", name: "Watercolour", blurb: "Soft botanical watercolour bunny in peach and lavender." },
  { id: "gothic", name: "Gothic", blurb: "Moody victorian bunny in crimson and ink." },
  { id: "cosmic", name: "Cosmic", blurb: "Space bunny with nebula fur and starlight aura." },
];

export function avatarUrl(id: AvatarId | string | null | undefined): string | null {
  if (!id) return null;
  return `${import.meta.env.BASE_URL}avatars/bunny-${id}.png`;
}

export function isAvatarId(v: unknown): v is AvatarId {
  if (typeof v !== "string") return false;
  return AVATAR_OPTIONS.some((a) => a.id === v);
}
