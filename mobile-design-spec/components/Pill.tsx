import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, radius, space } from "../tokens";

interface Props {
  label: string;
  icon?: React.ReactNode;
  variant?: "gold" | "neutral";
}

/**
 * Small status badge. The "gold" variant is the amber-tinted info pill
 * used for "Save your collection" / "No spoilers ahead" / "RECENTLY GENERATED".
 */
export function Pill({ label, icon, variant = "neutral" }: Props) {
  const isGold = variant === "gold";
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isGold ? "rgba(251,191,36,0.10)" : colors.bgSubtle,
          borderColor:    isGold ? "rgba(251,191,36,0.30)" : colors.border,
        },
      ]}
    >
      {icon}
      <Text
        style={{
          fontFamily: fontFamily.sansSemibold,
          fontSize: 11,
          color: isGold ? colors.goldSoft : colors.text,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
});
