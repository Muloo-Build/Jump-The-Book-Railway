import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, Line, G } from "react-native-svg";
import { colors, fontFamily, radius } from "../tokens";

type Style = "cinematic" | "comic" | "watercolour";

interface Props {
  /** Stable seed — same seed always renders the same composition. */
  seed: string;
  style?: Style;
  /** "16/9" | "3/4" | "1/1" | "4/5" | "9/13" | "3/2" — anything aspectRatio supports. */
  ratio?: number | string;
  /** Top-left chip e.g. "CH. 14 · 02". */
  cornerNote?: string;
  /** Bottom italic caption. */
  label?: string;
  /** Optional real artwork URL — when present, replaces procedural background. */
  imageUrl?: string;
}

/**
 * Procedural placeholder for AI-generated scene art. Use it everywhere a real
 * scene image would go until generation is wired up. Direct port of
 * source-from-canvas/primitives.jsx → SceneArt.
 *
 * Required: npx expo install react-native-svg expo-linear-gradient
 */
export function SceneArt({
  seed,
  style = "cinematic",
  ratio = "16/9",
  cornerNote,
  label,
  imageUrl,
}: Props) {
  const aspect = useMemo(() => {
    if (typeof ratio === "number") return ratio;
    const [a, b] = ratio.split("/").map(Number);
    return a / b;
  }, [ratio]);

  const composition = useMemo(() => buildComposition(seed, style), [seed, style]);

  return (
    <View style={[styles.wrap, { aspectRatio: aspect }]}>
      {/* Sky gradient background */}
      <LinearGradient
        colors={[composition.bg, composition.mid] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Composition overlay */}
      <Svg
        viewBox="0 0 100 56.25"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill as any}
      >
        <Defs>
          <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={composition.light} stopOpacity={0.95} />
            <Stop offset="40%" stopColor={composition.fg} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={composition.fg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Sun / light source */}
        <Circle
          cx={composition.sunX}
          cy={composition.sunY}
          r={composition.sunR * 1.8}
          fill="url(#sun)"
          opacity={style === "watercolour" ? 0.6 : 0.85}
        />
        {style !== "watercolour" && (
          <Circle cx={composition.sunX} cy={composition.sunY} r={composition.sunR * 0.45} fill={composition.light} opacity={0.7} />
        )}
        {/* Mid-ground silhouettes */}
        <G opacity={style === "comic" ? 1 : 0.85}>
          {composition.silhouettes.map((s, i) => (
            <Rect
              key={i}
              x={s.x}
              y={composition.horizonPx - s.h * 0.5}
              width={s.w}
              height={s.h * 0.8}
              fill={style === "comic" ? composition.bg : composition.mid}
              stroke={style === "comic" ? composition.fg : "none"}
              strokeWidth={style === "comic" ? 0.4 : 0}
              opacity={0.7 + (i / composition.silhouettes.length) * 0.3}
            />
          ))}
        </G>
        {/* Horizon line */}
        <Line
          x1={0} y1={composition.horizonPx} x2={100} y2={composition.horizonPx}
          stroke={composition.fg} strokeWidth={0.2} opacity={0.4}
        />
        {/* Foreground subject */}
        <Rect
          x={composition.subjX}
          y={56.25 - composition.subjH * 0.45}
          width={composition.subjW * 0.5}
          height={composition.subjH * 0.45}
          fill={composition.bg}
          opacity={0.95}
          stroke={style === "comic" ? composition.fg : "none"}
          strokeWidth={style === "comic" ? 0.3 : 0}
        />
        {/* Foreground floor */}
        <Rect x={0} y={composition.horizonPx} width={100} height={56.25} fill={composition.bg} opacity={style === "watercolour" ? 0.5 : 0.75} />
      </Svg>

      {/* Vignette */}
      <View pointerEvents="none" style={styles.vignette} />

      {/* Corner mono chip */}
      {cornerNote ? (
        <View style={styles.corner}>
          <Text style={styles.cornerText}>{cornerNote}</Text>
        </View>
      ) : null}
      {/* Italic caption */}
      {label ? (
        <View style={styles.captionWrap}>
          <Text style={styles.captionText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Procedural generator (port of primitives.jsx → SceneArt internals)
// ─────────────────────────────────────────────────────────────

const SCENE_PALETTES: Record<Style, Array<[string, string, string, string]>> = {
  cinematic: [
    ["#0E1A26", "#1F3D5C", "#3A6088", "#D4B26B"],
    ["#1A0B14", "#3D1A2A", "#6B2C44", "#E8B86A"],
    ["#0A1014", "#16282E", "#2D4A52", "#9CC5D6"],
    ["#15110B", "#2E2418", "#5A4226", "#C49A5C"],
    ["#0C1424", "#1B2746", "#3C4F7A", "#A8B5D9"],
    ["#1F0F0A", "#3C1A12", "#7A3322", "#E2A06B"],
  ],
  comic: [
    ["#0F1A2E", "#1F4E9C", "#E63946", "#FFD166"],
    ["#15131A", "#3B1F4A", "#A04AB5", "#F2C94C"],
    ["#0E1A14", "#1E5128", "#FF8C42", "#FFE066"],
    ["#19121F", "#2B1B36", "#D7263D", "#F1FAEE"],
  ],
  watercolour: [
    ["#1F2B3D", "#5C7A99", "#B5A491", "#E8D9C4"],
    ["#2D2438", "#7A6A8C", "#C9A4A4", "#F0E2D4"],
    ["#1A2E2A", "#5C8A7E", "#C4B89B", "#F0EAD9"],
    ["#3D2A1F", "#8C6647", "#D4B58F", "#F2E7D5"],
  ],
};

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function buildComposition(seed: string, style: Style) {
  const r = rng(hashSeed(seed + style));
  const palettes = SCENE_PALETTES[style];
  const pal = palettes[Math.floor(r() * palettes.length)];
  const [bg, mid, fg, light] = pal;

  const horizonY = 50 + r() * 25;
  const horizonPx = horizonY * 0.5625;
  const sunX = 20 + r() * 60;
  const sunY = horizonY * 0.5625 - 8 - r() * 18;
  const sunR = 8 + r() * 14;

  const silCount = 4 + Math.floor(r() * 5);
  const silhouettes = Array.from({ length: silCount }, (_, i) => ({
    x: (i / silCount) * 100 + (r() - 0.5) * 6,
    w: 6 + r() * 14,
    h: 8 + r() * 22,
  }));

  return {
    bg, mid, fg, light,
    horizonPx, sunX, sunY, sunR,
    silhouettes,
    subjX: 35 + r() * 30,
    subjW: 10 + r() * 14,
    subjH: 16 + r() * 20,
  };
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.ink800,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    // RN can't do radial-gradient natively. The dark edges on the source CSS
    // version are skipped here to keep the dependency-free; if you want them,
    // overlay a ring SVG or reach for react-native-linear-gradient with a
    // diagonal.
  },
  corner: {
    position: "absolute",
    top: 8, left: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  cornerText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.gold200,
    textTransform: "uppercase",
  },
  captionWrap: {
    position: "absolute",
    bottom: 8, left: 10, right: 10,
  },
  captionText: {
    fontFamily: fontFamily.serifMediumItalic,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 17,
  },
});
