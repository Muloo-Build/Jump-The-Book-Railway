import React from "react";
import { Pressable, View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamily, radius } from "../tokens";

interface Props {
  title: string;
  location?: string;
  gradient: string[];
  imageUrl?: string | null;
  onPress?: () => void;
  width?: number;
}

/**
 * Rectangular scene tile (16:9) used in the horizontal "Scene library" row.
 * Has a gradient background, optional image overlay, and bottom-anchored
 * caption with a black-to-transparent overlay for legibility.
 */
export function SceneTile({ title, location, gradient, imageUrl, onPress, width = 220 }: Props) {
  const colorsArr = (gradient.length >= 2 ? gradient : ["#1a1525", "#453560"]) as [string, string, ...string[]];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <LinearGradient
        colors={colorsArr}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
          resizeMode="cover"
        />
      ) : null}
      <LinearGradient
        colors={["transparent", colors.overlayBlack60]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.caption}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {location ? <Text numberOfLines={1} style={styles.loc}>{location}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.bgSubtle,
  },
  caption: { position: "absolute", left: 12, right: 12, bottom: 10 },
  title: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: "#ffffff",
  },
  loc: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
});
