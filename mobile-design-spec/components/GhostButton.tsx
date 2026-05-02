import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { colors, type, radius, space } from "../tokens";

interface Props {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}

/**
 * Outlined dark button. Used for secondary actions like "Upload", "Sign in",
 * "Snap a cover", etc. Web counterpart: <Button variant="ghost"> with border.
 */
export function GhostButton({ label, onPress, icon, size = "md" }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        pressed && { backgroundColor: colors.bgSubtle, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={[type.buttonLabel, { color: colors.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  md: { paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 44 },
  sm: { paddingHorizontal: space.md, paddingVertical: 8,  minHeight: 36 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
});
