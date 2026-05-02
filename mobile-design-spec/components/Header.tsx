import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Logo } from "../Logo";
import { colors, fontFamily, space } from "../tokens";

interface Props {
  onLogoPress?: () => void;
  right?: React.ReactNode;
}

/**
 * Top header with bunny logo + wordmark "Jump the Book" (italic gold "the").
 * Mirrors artifacts/jump-the-book-web/src/components/layout.tsx header.
 */
export function Header({ onLogoPress, right }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable style={styles.brand} onPress={onLogoPress} hitSlop={8}>
        <Logo size={28} />
        <Text style={styles.wordmark}>
          Jump <Text style={styles.italic}>the</Text> Book
        </Text>
      </Pressable>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    paddingHorizontal: space.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    color: colors.text,
  },
  italic: {
    fontFamily: fontFamily.serifItalic,
    color: colors.goldSoft,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
});
