import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamily, radius } from "../tokens";

interface Props {
  title: string;
  author: string;
  /** 2-3 hex colours from the book's coverGradient. */
  gradient: string[];
  tagline?: string;
  onPress?: () => void;
}

/**
 * Tall 2:3 gradient book cover tile. Mirrors the "Classics" row on the
 * web library page.
 *
 * Required: npx expo install expo-linear-gradient
 */
export function BookTile({ title, author, gradient, tagline, onPress }: Props) {
  const colorsArr = (gradient.length >= 2 ? gradient : ["#1a1525", "#453560"]) as [string, string, ...string[]];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <LinearGradient
        colors={colorsArr}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cover}
      />
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <Text numberOfLines={1} style={styles.author}>{author}</Text>
        {tagline ? <Text numberOfLines={1} style={styles.tagline}>{tagline}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  cover: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  meta: { marginTop: 8 },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    color: colors.text,
  },
  author: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  tagline: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 2,
    fontStyle: "italic",
  },
});
