// Variant 3 — Cinematic library
// Full-bleed scene hero up top with paginator dots, then horizontal rows.
// Direct port of source-from-canvas/mobile-screens.jsx → MobLibCinematic.

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Play, Film } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MobShell } from "../components/MobShell";
import { SectionHeading } from "../components/SectionHeading";
import { BookCover } from "../components/BookCover";
import { SceneArt } from "../components/SceneArt";
import { Tag } from "../components/Tag";
import { Button } from "../components/Button";
import { colors, fontFamily, space } from "../tokens";

export function MobLibCinematic({ artStyle = "cinematic" }: { artStyle?: "cinematic" | "comic" | "watercolour" }) {
  return (
    <MobShell activeTab="library">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cinematic hero */}
        <View style={styles.heroWrap}>
          <SceneArt seed="cine-hero" style={artStyle} ratio="9/13" />
          <LinearGradient
            colors={["rgba(8,8,11,0.4)", "transparent", "transparent", colors.overlay95] as [string, string, string, string]}
            locations={[0, 0.3, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* paginator dots */}
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.heroOverlay}>
            <Tag>Continue · Ch. 14</Tag>
            <Text style={styles.heroTitle}>House of Sky{"\n"}and Breath</Text>
            <Text style={styles.heroMeta}>Sarah J. Maas · 62% · 4 hr left</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Resume" size="sm"
                icon={<Play size={11} color={colors.onAccent} fill={colors.onAccent} />} />
              <Button label="Scenes" size="sm" variant="ghost"
                icon={<Film size={12} color={colors.text} strokeWidth={1.4} />} />
            </View>
          </View>
        </View>

        {/* Your shelf row */}
        <SectionHeading title="Your shelf" cta="See all" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: space.lg, paddingBottom: space.xxl }}>
          {["Spaceops", "Zero Hour", "Piranesi", "Hail Mary"].map((t, i) => (
            <View key={t} style={{ width: 110 }}>
              <BookCover title={t} author={["Alanson", "Alanson", "Clarke", "Weir"][i]} height={165} />
            </View>
          ))}
        </ScrollView>

        {/* Lately visualised */}
        <SectionHeading title="Lately visualised" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingHorizontal: space.lg, paddingBottom: 80 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ width: 130 }}>
              <SceneArt seed={`cine-l-${i}`} style={artStyle} ratio="4/5" cornerNote={`SC.${i + 1}`} />
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </MobShell>
  );
}

const styles = StyleSheet.create({
  heroWrap: { position: "relative", height: 460, marginTop: -8 },
  heroOverlay: { position: "absolute", bottom: 24, left: 20, right: 20 },
  heroTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 28,
    lineHeight: 30,
    color: "#fff",
    letterSpacing: -0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  heroMeta: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 16,
  },
  dots: {
    position: "absolute",
    top: 14,
    left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 16, height: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { backgroundColor: "#fff" },
});
