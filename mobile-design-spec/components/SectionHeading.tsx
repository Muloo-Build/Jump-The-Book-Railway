import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, type, space } from "../tokens";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

/**
 * Serif "My books" / "Classics" / "Scene library" section heading,
 * with optional right-side link. Mirrors the web's <h2> + thin border.
 */
export function SectionHeading({ title, subtitle, actionLabel, onActionPress }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={type.section}>{title}</Text>
        {actionLabel ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <Text style={[type.caption, { color: colors.textMuted }]}>{actionLabel} →</Text>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? <Text style={[type.caption, styles.subtitle]}>{subtitle}</Text> : null}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.xl, marginBottom: space.md },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  subtitle: { marginTop: 2 },
  divider: {
    marginTop: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
