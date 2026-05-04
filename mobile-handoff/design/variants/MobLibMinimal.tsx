// Variant 2 — Minimal list library
// Text-forward, fewer images. Search bar + book rows with mono status.
// Direct port of source-from-canvas/mobile-screens.jsx → MobLibMinimal.

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ChevronRight, Search } from "lucide-react-native";
import { MobShell } from "../components/MobShell";
import { BookCover } from "../components/BookCover";
import { ProgressBar } from "../components/ProgressBar";
import { colors, fontFamily, type, space } from "../tokens";

const BOOKS = [
  { t: "House of Sky and Breath", a: "Sarah J. Maas",  p: 0.62, s: "Reading now" },
  { t: "Spaceops",                a: "Craig Alanson",  p: 0.34, s: "Last week" },
  { t: "Zero Hour",               a: "Craig Alanson",  p: 0.05, s: "Just added" },
  { t: "Piranesi",                a: "Susanna Clarke", p: 1.00, s: "Finished" },
  { t: "Project Hail Mary",       a: "Andy Weir",      p: 1.00, s: "Finished" },
];

export function MobLibMinimal() {
  return (
    <MobShell activeTab="library">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ paddingHorizontal: space.xl, paddingBottom: space.lg }}>
          <Text style={{ ...type.hero, fontSize: 30 }}>Your library</Text>
          <Text style={{ ...type.bodyMute, marginTop: 4 }}>14 books · 184 scenes generated</Text>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          <View style={styles.search}>
            <Search size={13} color={colors.textMute} strokeWidth={1.4} />
            <Text style={{ ...type.body, color: colors.textMute, fontSize: 13 }}>Search title, author, scene…</Text>
          </View>
        </View>

        {/* List */}
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          {BOOKS.map((b) => (
            <View key={b.t} style={styles.row}>
              <BookCover title={b.t} author={b.a} height={70} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...type.eyebrow, color: colors.accent }}>{b.s}</Text>
                <Text numberOfLines={1} style={styles.title}>{b.t}</Text>
                <Text numberOfLines={1} style={{ ...type.bodyMute }}>{b.a}</Text>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar value={b.p} height={2} />
                </View>
              </View>
              <ChevronRight size={14} color={colors.textMute} strokeWidth={1.4} />
            </View>
          ))}
        </View>
      </ScrollView>
    </MobShell>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
});
