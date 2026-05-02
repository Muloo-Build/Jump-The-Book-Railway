import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, space } from "../tokens";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
}

/**
 * Dark card with subtle border. NEVER uses shadow — the dark theme uses
 * borders for separation, not elevation.
 */
export function Card({ children, style, padded = true }: Props) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  padded: { padding: space.lg },
});
