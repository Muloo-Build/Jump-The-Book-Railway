// Jump the Book — design tokens
// Direct port of the design canvas tokens.css. Drop into the mobile repo
// at e.g. src/design/tokens.ts and import { colors, type, space, radius } from "@/design/tokens".

export const colors = {
  // Ink ramp — layered near-blacks with a hint of warm violet undertone
  ink900: "#08080B",   // deepest — page bg
  ink800: "#0F1015",   // card bg
  ink700: "#16171E",   // elevated card
  ink600: "#1E1F28",   // hover / popover
  ink500: "#2A2B36",   // divider strong
  ink400: "#3A3B47",   // divider
  ink300: "#5A5B68",   // muted text
  ink200: "#8A8B97",   // secondary text
  ink100: "#C7C8D1",   // primary text (cool)

  // Paper — warm off-whites, used for body text on dark
  paper:  "#EDE6D3",
  paper2: "#F5EFDF",

  // Gold ramp — antique brass, the accent system
  gold50:  "#FBF3DC",
  gold100: "#F2E1B0",
  gold200: "#E6C885",  // highlight
  gold300: "#D4B26B",
  gold400: "#C9A96A",  // primary
  gold500: "#B0904D",
  gold600: "#8E7339",
  gold700: "#6B552A",
  gold800: "#463818",

  // Semantic aliases
  bg:           "#08080B",
  bgCard:       "#0F1015",
  bgRaise:      "#16171E",
  border:       "rgba(201,169,106,0.10)",
  borderStrong: "rgba(201,169,106,0.22)",
  text:         "#EDE6D3",
  textDim:      "#9D958A",
  textMute:     "#6B6258",
  accent:       "#C9A96A",
  accentHi:     "#E6C885",
  accentLo:     "#6B552A",
  // Text colour that goes on top of the gold accent button.
  onAccent:     "#1A1208",

  // Overlay colours used in cinematic / hero scrims
  overlay95:    "rgba(8,8,11,0.95)",
  overlay85:    "rgba(8,8,11,0.85)",
  overlay60:    "rgba(0,0,0,0.6)",
  overlay40:    "rgba(0,0,0,0.4)",
} as const;

export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, hero: 48,
  screenX: 20,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 14, xl: 22, pill: 999,
} as const;

// Shadow recipes (use as object literals on RN style; on iOS only the
// shadow* keys apply — Android uses elevation).
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  raised: {
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  // Subtle gold glow used on the primary CTA when prominent.
  goldGlow: {
    shadowColor: colors.gold400,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 0,
  },
} as const;

// Font family identifiers — must match those loaded in fonts.ts via @expo-google-fonts.
export const fontFamily = {
  serifRegular:        "CormorantGaramond_400Regular",
  serifMedium:         "CormorantGaramond_500Medium",
  serifMediumItalic:   "CormorantGaramond_500Medium_Italic",
  serifSemibold:       "CormorantGaramond_600SemiBold",
  sansRegular:         "Inter_400Regular",
  sansMedium:          "Inter_500Medium",
  sansSemibold:        "Inter_600SemiBold",
  mono:                "JetBrainsMono_400Regular",
  monoMedium:          "JetBrainsMono_500Medium",
} as const;

// Pre-baked text styles. Use directly: <Text style={type.hero}>…</Text>
export const type = {
  // Serif display — page titles, hero copy, narration.
  hero: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.text,
  },
  heroAccent: {
    fontFamily: fontFamily.serifMediumItalic,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.accentHi,
  },
  // Section headings — second-level serif inside a page.
  section: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.text,
  },
  // Pull-quote inside a hero card / scene.
  pullquote: {
    fontFamily: fontFamily.serifMediumItalic,
    fontSize: 18,
    lineHeight: 24,
    color: "#ffffff",
  },
  // Reader body — long-form serif text.
  reader: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 17,
    lineHeight: 28,
    color: colors.text,
  },
  // Sans body
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  bodyDim: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textDim,
  },
  bodyMute: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMute,
  },
  bodyStrong: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  buttonLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    lineHeight: 13,
    letterSpacing: 0.1,
  },
  // Mono eyebrows / metadata — the signature touch of this design.
  // Used for: timestamps, "CHAPTER 14", "CONTINUE · 62%", scene numbers.
  eyebrow: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    color: colors.accent,
  },
  eyebrowMute: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    color: colors.textMute,
  },
  meta: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1,
    color: colors.textMute,
  },
  // Tab bar label
  tabLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.3,
  },
} as const;

// React Navigation theme — paste into NavigationContainer's theme prop.
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: fontFamily.sansRegular,  fontWeight: "400" as const },
    medium:  { fontFamily: fontFamily.sansMedium,   fontWeight: "500" as const },
    bold:    { fontFamily: fontFamily.sansSemibold, fontWeight: "600" as const },
    heavy:   { fontFamily: fontFamily.serifMedium,  fontWeight: "500" as const },
  },
} as const;
