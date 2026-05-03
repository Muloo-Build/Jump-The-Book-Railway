import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../tokens";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  /** When over a scene image, use dark=true for a translucent backdrop. */
  dark?: boolean;
  style?: ViewStyle;
}

/**
 * 32×32 icon-only button. Used in the mobile shell header and hero overlays.
 * Mirrors mobile-screens.jsx → IconBtn.
 */
export function IconButton({ children, onPress, dark, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        dark && styles.dark,
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dark: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
