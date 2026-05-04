import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily } from "../tokens";

interface Props {
  children: string;
}

/**
 * Mono uppercase eyebrow tag with gold border + tint.
 * Used for "CONTINUE · CH. 14", "CH. 14 · SCENE 02", etc.
 * Mirrors source-from-canvas/primitives.jsx → Tag.
 */
export function Tag({ children }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: "rgba(201,169,106,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,169,106,0.18)",
  },
  text: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.accent,
  },
});
