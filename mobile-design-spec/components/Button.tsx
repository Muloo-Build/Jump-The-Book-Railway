import React from "react";
import {
  Pressable, Text, View, ActivityIndicator, StyleSheet, ViewStyle,
} from "react-native";
import { colors, type, radius, shadows } from "../tokens";

type Variant = "primary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
}

/**
 * Pill button matching source-from-canvas/primitives.jsx → Btn.
 *  - primary: antique-brass gold with inset highlight + soft glow
 *  - ghost:   transparent with strong border
 *  - quiet:   barely-there elevated dark, used for tertiary actions
 */
export function Button({
  label, onPress, icon, loading, disabled,
  variant = "primary", size = "md", style,
}: Props) {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        s.shape,
        v.shape,
        variant === "primary" && shadows.goldGlow,
        pressed && !isDisabled && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        isDisabled && { opacity: 0.45 },
        style,
      ]}
    >
      {/* Inset highlight for primary — recreates the CSS box-shadow inset rule. */}
      {variant === "primary" && <View pointerEvents="none" style={styles.inset} />}
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={[styles.row, { gap: s.gap }]}>
          {icon}
          <Text style={[type.buttonLabel, { color: v.text, fontSize: s.fontSize }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const sizeStyles: Record<Size, { shape: ViewStyle; gap: number; fontSize: number }> = {
  sm: { shape: { paddingHorizontal: 12, height: 30 }, gap: 6, fontSize: 12 },
  md: { shape: { paddingHorizontal: 16, height: 38 }, gap: 8, fontSize: 13 },
  lg: { shape: { paddingHorizontal: 22, height: 46 }, gap: 10, fontSize: 14 },
};

const variantStyles: Record<Variant, { shape: ViewStyle; text: string }> = {
  primary: {
    shape: {
      backgroundColor: colors.accent,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentHi,
    },
    text: colors.onAccent,
  },
  ghost: {
    shape: {
      backgroundColor: "transparent",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderStrong,
    },
    text: colors.text,
  },
  quiet: {
    shape: {
      backgroundColor: "rgba(255,255,255,0.03)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    text: colors.textDim,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center" },
  inset: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});
