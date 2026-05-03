import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { colors, fontFamily } from "../tokens";

interface Props {
  size?: number;
  /** When provided, renders the mark to the left at this size. */
  mark?: React.ReactNode;
  gap?: number;
}

/**
 * "Jump the Book" wordmark — italic gold "Jump", faded "the", plain "Book".
 * Mirrors source-from-canvas/logos.jsx → Wordmark.
 */
export function Wordmark({ size = 22, mark, gap = 10 }: Props) {
  const word = (
    <Text style={[styles.text, { fontSize: size, lineHeight: size }]} numberOfLines={1}>
      <Text style={styles.italic}>Jump</Text>
      <Text style={styles.faint}> the </Text>
      <Text>Book</Text>
    </Text>
  );
  if (!mark) return word;
  return (
    <View style={[styles.row, { gap }]}>
      {mark}
      {word}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  text: {
    fontFamily: fontFamily.serifMedium,
    color: colors.text,
  },
  italic: {
    fontFamily: fontFamily.serifMediumItalic,
    color: colors.accent,
  },
  faint: { opacity: 0.55 },
});
