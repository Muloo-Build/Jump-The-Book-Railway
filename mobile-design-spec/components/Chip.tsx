import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, fontFamily } from "../tokens";

interface Props {
  children: string;
  active?: boolean;
  onPress?: () => void;
}

/**
 * Filter chip used in the scene-first library grid header.
 * Mirrors source-from-canvas/primitives.jsx → Chip.
 */
export function Chip({ children, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: active ? "rgba(201,169,106,0.14)" : "rgba(255,255,255,0.03)",
          borderColor: active ? colors.borderStrong : colors.border,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.sansMedium,
          fontSize: 11,
          letterSpacing: 0.2,
          color: active ? colors.accentHi : colors.textDim,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
