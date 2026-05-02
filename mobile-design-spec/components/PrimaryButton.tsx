import React from "react";
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { colors, type, radius, space } from "../tokens";

interface Props {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}

/**
 * Filled amber gold button — used for the primary action on every screen.
 * Web counterpart: <Button className="bg-amber-400 text-black …">
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  size = "md",
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        isDisabled && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.goldOnBg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[type.buttonLabel, { color: colors.goldOnBg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  md: { paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 44 },
  sm: { paddingHorizontal: space.md, paddingVertical: 8,  minHeight: 36 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
});
