import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../tokens";

interface Props {
  /** 0…1 */
  value: number;
  height?: number;
}

/**
 * Thin gold-gradient progress bar. Mirrors primitives.jsx → ProgressBar.
 * Required: npx expo install expo-linear-gradient
 */
export function ProgressBar({ value, height = 3 }: Props) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        width: "100%",
        height,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: height,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={[colors.accent, colors.accentHi]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${v * 100}%`, height: "100%" }}
      />
    </View>
  );
}
