import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface BadgeProps {
  label: string;
  variant?: "primary" | "accent" | "muted" | "gold";
}

export function Badge({ label, variant = "muted" }: BadgeProps) {
  const colors = useColors();

  const bgMap = {
    primary: colors.primary + "30",
    accent: colors.accent + "30",
    muted: colors.muted,
    gold: colors.gold + "25",
  };
  const fgMap = {
    primary: colors.primary,
    accent: colors.accent,
    muted: colors.mutedForeground,
    gold: colors.gold,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgMap[variant] }]}>
      <Text style={[styles.text, { color: fgMap[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
