// Variant 4 — Scene-first library
// Segmented control + filter chips + irregular scene grid.
// Direct port of source-from-canvas/mobile-screens.jsx → MobLibSceneFirst.

import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { MobShell } from "../components/MobShell";
import { SceneArt } from "../components/SceneArt";
import { Chip } from "../components/Chip";
import { colors, fontFamily, type, space } from "../tokens";

const TABS = [
  ["scenes", "Scenes"],
  ["books",  "Books"],
  ["saved",  "Saved"],
] as const;

const FILTERS = ["All", "House of Sky", "Spaceops", "Piranesi", "Watercolour", "Cinematic"];

export function MobLibSceneFirst({ artStyle = "cinematic" }: { artStyle?: "cinematic" | "comic" | "watercolour" }) {
  const [tab, setTab] = useState<typeof TABS[number][0]>("scenes");
  return (
    <MobShell activeTab="library">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: space.xl, paddingBottom: space.md }}>
          <Text style={{ ...type.hero, fontSize: 30 }}>Library</Text>
          <Text style={{ ...type.bodyMute, marginTop: 4 }}>184 scenes from 14 books</Text>
        </View>

        {/* Segmented control */}
        <View style={{ paddingHorizontal: space.xl, paddingBottom: 14 }}>
          <View style={styles.seg}>
            {TABS.map(([k, l]) => {
              const on = tab === k;
              return (
                <Pressable key={k} onPress={() => setTab(k)} style={[styles.segItem, on && styles.segItemOn]}>
                  <Text style={{
                    fontFamily: fontFamily.sansMedium,
                    fontSize: 12,
                    color: on ? colors.onAccent : colors.textDim,
                  }}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: space.xl, paddingBottom: space.lg }}>
          {FILTERS.map((c, i) => <Chip key={c} active={i === 0}>{c}</Chip>)}
        </ScrollView>

        {/* Irregular grid — first + 6th cells span 2 columns */}
        <View style={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => {
            const big = i === 0 || i === 5;
            return (
              <View key={i} style={{ width: big ? "100%" : "48.5%" }}>
                <SceneArt
                  seed={`sf-${i}`}
                  style={artStyle}
                  ratio={big ? "16/9" : "3/4"}
                  cornerNote={`Ch. ${(i * 3) % 14 + 1}`}
                  label={big ? "A long quiet across the threshold" : undefined}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </MobShell>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 3,
  },
  segItem: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 6 },
  segItemOn: { backgroundColor: colors.accent },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: space.lg,
    paddingBottom: 80,
  },
});
