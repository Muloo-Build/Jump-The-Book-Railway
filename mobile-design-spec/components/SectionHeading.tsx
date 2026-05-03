import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, type, space } from "../tokens";

interface Props {
  title: string;
  /** Right-side mono meta, e.g. "184" or "See all". */
  cta?: string;
}

/**
 * "My books" / "Recent scenes" header — serif left, mono number/CTA right.
 * Mirrors mobile-screens.jsx → MobSection.
 */
export function SectionHeading({ title, cta }: Props) {
  return (
    <View style={styles.row}>
      <Text style={type.section}>{title}</Text>
      {cta ? (
        <Text style={{
          fontFamily: fontFamily.mono,
          fontSize: 10,
          letterSpacing: 1,
          color: colors.textMute,
        }}>
          {cta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
});
