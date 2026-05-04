import React from "react";
import { View, StyleSheet } from "react-native";
import { LogoCrescent } from "../Logo";
import { Wordmark } from "./Wordmark";
import { colors, space } from "../tokens";

interface Props {
  /** Right-side actions (e.g. <IconButton>). */
  right?: React.ReactNode;
  /** Hide the bottom hairline (used in cinematic / minimal screens). */
  noBorder?: boolean;
}

/**
 * Standard mobile screen header: bunny mark + "Jump the Book" wordmark on the
 * left, optional actions on the right. Mirrors mobile-screens.jsx → MobShell
 * non-minimal header path.
 */
export function Header({ right, noBorder }: Props) {
  return (
    <View style={[styles.bar, !noBorder && styles.border]}>
      <Wordmark size={14} mark={<LogoCrescent size={22} />} gap={10} />
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 4 },
});
