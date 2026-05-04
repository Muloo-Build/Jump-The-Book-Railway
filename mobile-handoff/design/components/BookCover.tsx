import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamily, shadows } from "../tokens";

interface Props {
  title: string;
  author?: string;
  /** Tile height in pt. Width is derived 2:3. */
  height?: number;
}

/**
 * Procedural book-cover placeholder — a deterministic gradient + serif title
 * stamp. Use this when you don't yet have artwork. Mirrors primitives.jsx →
 * BookCover.
 *
 * Required: npx expo install expo-linear-gradient
 */
export function BookCover({ title, author, height = 150 }: Props) {
  const { c1, c2, c3 } = useMemo(() => paletteFor(title), [title]);
  const fontSize = height * 0.085;
  const authorSize = height * 0.04;

  return (
    <View style={[styles.wrap, { height, width: (height * 2) / 3 }, shadows.raised]}>
      <LinearGradient
        colors={[c1, c2, c1] as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* spine highlight */}
      <View style={styles.spine} />
      {/* deco bands */}
      <View style={[styles.band, { top: "12%", backgroundColor: c3 }]} />
      <View style={[styles.band, { bottom: "14%", backgroundColor: c3 }]} />
      <Text
        numberOfLines={4}
        style={{
          position: "absolute",
          left: "8%", right: "8%", top: "20%",
          fontFamily: fontFamily.serifSemibold,
          color: c3,
          fontSize,
          lineHeight: fontSize * 1.05,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      {author ? (
        <Text
          numberOfLines={1}
          style={{
            position: "absolute",
            left: "8%", right: "8%", bottom: "7%",
            fontFamily: fontFamily.sansRegular,
            color: c3,
            opacity: 0.8,
            fontSize: authorSize,
            textTransform: "uppercase",
            letterSpacing: 1.2,
          }}
        >
          {author}
        </Text>
      ) : null}
    </View>
  );
}

// Six palettes lifted from the canvas. Pick one deterministically by title.
const PALETTES: Array<[string, string, string]> = [
  ["#3D1A2A", "#6B2C44", "#E6C885"],
  ["#0E1A26", "#1F3D5C", "#D4B26B"],
  ["#1A0B14", "#2D1B36", "#A04AB5"],
  ["#15110B", "#2E2418", "#C49A5C"],
  ["#0A1B14", "#1E5128", "#E8B86A"],
  ["#1F2B3D", "#5C7A99", "#F0E2D4"],
];

function paletteFor(seed: string): { c1: string; c2: string; c3: string } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const [c1, c2, c3] = PALETTES[(h >>> 0) % PALETTES.length];
  return { c1, c2, c3 };
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 2 / 3,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.ink800,
  },
  spine: {
    position: "absolute",
    left: 0, top: 0, bottom: 0, width: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  band: {
    position: "absolute", left: "8%", right: "8%", height: 1, opacity: 0.7,
  },
});
