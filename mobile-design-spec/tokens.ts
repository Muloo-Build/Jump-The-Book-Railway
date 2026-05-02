// Jump the Book — design tokens
// Direct port of artifacts/jump-the-book-web/src/index.css (.dark theme).
// Drop this file into the mobile repo (e.g. src/design/tokens.ts) and
// import { colors, type, space, radius } from "@/design/tokens".

export const colors = {
  bg:           "#0a0810",
  bgElevated:   "#0e0c14",
  bgSubtle:     "#16131e",
  border:       "#211e2b",
  borderStrong: "#2c2839",

  text:        "#ece4d4",
  textMuted:   "#7d7488",
  textFaint:   "#4d4658",

  gold:        "#fbbf24",
  goldOnBg:    "#000000",
  goldSoft:    "#fde68a",
  goldRing:    "#b58a3d",

  dangerBg:    "#7a2222",
  dangerText:  "#ffeded",

  // Hard transparent overlays used in cinematic / playback views.
  overlayBlack60: "rgba(0,0,0,0.6)",
  overlayBlack40: "rgba(0,0,0,0.4)",
  overlayBlack20: "rgba(0,0,0,0.2)",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  hero: 64,
  screenX: 20,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

// Font family names — must match those loaded in fonts.ts via expo-font.
export const fontFamily = {
  serif:        "PlayfairDisplay_700Bold",
  serifItalic:  "PlayfairDisplay_700Bold_Italic",
  sans:         "PlusJakartaSans_400Regular",
  sansMedium:   "PlusJakartaSans_500Medium",
  sansSemibold: "PlusJakartaSans_600SemiBold",
} as const;

// Pre-baked text styles. Use directly: <Text style={type.hero}>…</Text>
export const type = {
  hero: {
    fontFamily: fontFamily.serif,
    fontSize: 36,
    lineHeight: 40,
    color: colors.text,
  },
  heroAccent: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 36,
    lineHeight: 40,
    color: colors.goldSoft,
  },
  section: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodyMuted: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  bodyStrong: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  caption: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  eyebrow: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    color: colors.gold,
  },
  buttonLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    lineHeight: 14,
  },
  narration: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
    textAlign: "center" as const,
  },
} as const;

// React Navigation theme — paste into NavigationContainer's theme prop.
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.gold,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.gold,
  },
  fonts: {
    regular:  { fontFamily: fontFamily.sans,         fontWeight: "400" as const },
    medium:   { fontFamily: fontFamily.sansMedium,   fontWeight: "500" as const },
    bold:     { fontFamily: fontFamily.sansSemibold, fontWeight: "600" as const },
    heavy:    { fontFamily: fontFamily.serif,        fontWeight: "700" as const },
  },
} as const;
