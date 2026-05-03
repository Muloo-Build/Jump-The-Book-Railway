import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, radius, shadows, space } from "../tokens";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  /** Use the deeper "raise" surface for hover/popover-style cards. */
  raised?: boolean;
}

export function Card({ children, style, padded = true, raised }: Props) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: raised ? colors.bgRaise : colors.bgCard },
        padded && styles.padded,
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  padded: { padding: space.lg },
});
