// Variant 1 — Editorial library
// Serif headline, scene-led continue card, horizontal book row, scene grid.
// Direct port of source-from-canvas/mobile-screens.jsx → MobLibEditorial.

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { MobShell } from "../components/MobShell";
import { SectionHeading } from "../components/SectionHeading";
import { BookCover } from "../components/BookCover";
import { SceneArt } from "../components/SceneArt";
import { colors, fontFamily, type, space } from "../tokens";

export function MobLibEditorial({ artStyle = "cinematic" }: { artStyle?: "cinematic" | "comic" | "watercolour" }) {
  return (
    <MobShell activeTab="library">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Eyebrow + hero */}
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl }}>
          <Text style={[type.eyebrow, { marginBottom: 8 }]}>◐ Tuesday Evening</Text>
          <Text style={type.hero}>
            The next <Text style={type.heroAccent}>scene</Text> awaits.
          </Text>
        </View>

        {/* Continue card — full-bleed scene with bottom scrim */}
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          <View style={styles.continueWrap}>
            <SceneArt seed="mob-cont" style={artStyle} ratio="3/4" cornerNote="Ch.14 · 02" />
            <View style={styles.continueScrim}>
              <Text style={[type.eyebrow, { color: colors.accentHi }]}>Continue · 62%</Text>
              <Text style={styles.continueTitle}>House of Sky and Breath</Text>
              <Text style={styles.continueMeta}>Sarah J. Maas · 4 hr left</Text>
            </View>
          </View>
        </View>

        {/* My books row */}
        <SectionHeading title="My books" cta="14" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          {["House of Sky", "Spaceops", "Zero Hour", "Piranesi"].map((t, i) => (
            <View key={t} style={{ width: 100 }}>
              <BookCover title={t} author={["Maas", "Alanson", "Alanson", "Clarke"][i]} height={150} />
              <Text numberOfLines={2} style={{ ...type.body, fontFamily: fontFamily.sansMedium, fontSize: 11, marginTop: 6 }}>
                {t}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Recent scenes — 2-up grid */}
        <SectionHeading title="Recent scenes" cta="184" />
        <View style={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.gridCell}>
              <SceneArt seed={`m-r-${i}`} style={artStyle} ratio="16/9" cornerNote={`Ch. ${i + 5}`} />
            </View>
          ))}
        </View>
      </ScrollView>
    </MobShell>
  );
}

const styles = StyleSheet.create({
  continueWrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  continueScrim: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  continueTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 22,
    color: "#fff",
    lineHeight: 24,
    marginTop: 6,
    marginBottom: 4,
  },
  continueMeta: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: fontFamily.sansRegular },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: space.lg,
    paddingBottom: 80,
  },
  gridCell: { width: "48.5%" },
});
