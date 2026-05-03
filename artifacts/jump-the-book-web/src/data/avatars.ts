// Bunny avatar gallery. Files live in `public/avatars/` so they're served
// as static SVG assets at `${BASE_URL}avatars/bunny-<id>.svg`. Adding a
// new bunny is a four-step change: drop the SVG into public/avatars/, add
// an entry here, add the id to the `AVATAR_IDS` set in the API's
// `me.ts`, and (optionally) update GENRE_TAGS in `data/profile.ts` if it
// implies a genre.
//
// Names are colour-keyed (cream/gold/rose/midnight/forest/ember/ink/paper/
// mauve/sage) per the v1.0 design handoff — they're just visual variants,
// not personality types, so the blurbs stay short and atmospheric.

export type AvatarId =
  | "cream"
  | "gold"
  | "rose"
  | "midnight"
  | "forest"
  | "ember"
  | "ink"
  | "paper"
  | "mauve"
  | "sage";

export interface AvatarOption {
  id: AvatarId;
  name: string;
  blurb: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "cream", name: "Cream", blurb: "Warm paper bunny on slate." },
  { id: "gold", name: "Gold", blurb: "Antique-brass bunny on deep ink." },
  { id: "rose", name: "Rose", blurb: "Burnished honey on dusk plum." },
  { id: "midnight", name: "Midnight", blurb: "Pale moonlit bunny on navy." },
  { id: "forest", name: "Forest", blurb: "Sage on a darkened glade." },
  { id: "ember", name: "Ember", blurb: "Warm copper on banked coals." },
  { id: "ink", name: "Ink", blurb: "Inky bunny with gold-rimmed eyes." },
  { id: "paper", name: "Paper", blurb: "Inverse — dark bunny on paper." },
  { id: "mauve", name: "Mauve", blurb: "Soft rose on twilight violet." },
  { id: "sage", name: "Sage", blurb: "Pale linen on deep sea-green." },
];

export function avatarUrl(id: AvatarId | string | null | undefined): string | null {
  if (!id) return null;
  return `${import.meta.env.BASE_URL}avatars/bunny-${id}.svg`;
}

export function isAvatarId(v: unknown): v is AvatarId {
  if (typeof v !== "string") return false;
  return AVATAR_OPTIONS.some((a) => a.id === v);
}
