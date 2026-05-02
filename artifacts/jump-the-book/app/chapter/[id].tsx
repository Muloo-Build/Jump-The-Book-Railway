import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SceneCard } from "@/components/SceneCard";
import { Badge } from "@/components/Badge";
import { CHAPTERS, DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

function findChapterById(chapterId: string) {
  for (const bookId of Object.keys(CHAPTERS)) {
    const chapters = CHAPTERS[bookId];
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) return { chapter, bookId };
  }
  return null;
}

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const result = findChapterById(id ?? "");
  if (!result) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Chapter not found</Text>
      </View>
    );
  }

  const { chapter, bookId } = result;
  const book = DEMO_BOOKS.find((b) => b.id === bookId);
  const allCharacters = [...new Set(chapter.scenes.flatMap((s) => s.characters))];
  const allLocations = [...new Set(chapter.scenes.map((s) => s.location))];
  const allMoods = [...new Set(chapter.scenes.map((s) => s.mood.split(", ")[0]))];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={book ? (book.coverGradient as [string, string, ...string[]]) : ["#1a1a4e", "#4a1a6e"]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: "rgba(0,0,0,0.35)" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.immersionHeaderBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            onPress={() => router.push(`/immersion-mode?bookId=${bookId}&chapterId=${chapter.id}`)}
          >
            <Feather name="maximize" size={16} color="#fff" />
            <Text style={styles.immersionHeaderText}>Immersion</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerInfo}>
          {book && (
            <Text style={styles.bookLabel}>{book.title}</Text>
          )}
          <Text style={styles.chapterNum}>Chapter {chapter.chapterNumber}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        </View>
      </LinearGradient>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Chapter Summary</Text>
        <Text style={[styles.summaryText, { color: colors.foreground }]}>{chapter.summary}</Text>
      </View>

      {/* Meta tags */}
      <View style={styles.tagsRow}>
        <View style={styles.tagGroup}>
          <Text style={[styles.tagGroupLabel, { color: colors.mutedForeground }]}>Characters</Text>
          <View style={styles.tags}>
            {allCharacters.map((c) => <Badge key={c} label={c} variant="primary" />)}
          </View>
        </View>
        <View style={styles.tagGroup}>
          <Text style={[styles.tagGroupLabel, { color: colors.mutedForeground }]}>Locations</Text>
          <View style={styles.tags}>
            {allLocations.map((l) => <Badge key={l} label={l} variant="muted" />)}
          </View>
        </View>
        <View style={styles.tagGroup}>
          <Text style={[styles.tagGroupLabel, { color: colors.mutedForeground }]}>Mood</Text>
          <View style={styles.tags}>
            {allMoods.map((m) => <Badge key={m} label={m} variant="accent" />)}
          </View>
        </View>
      </View>

      {/* Scenes */}
      <View style={styles.scenesSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {chapter.scenes.length} Scenes
        </Text>
        {chapter.scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            onImmersion={() =>
              router.push(`/immersion-mode?bookId=${bookId}&chapterId=${chapter.id}&sceneIndex=${i}`)
            }
            onSave={() => {}}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  immersionHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  immersionHeaderText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  headerInfo: { gap: 4 },
  bookLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  chapterNum: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)" },
  chapterTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryCard: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 24 },
  tagsRow: { paddingHorizontal: 20, gap: 14, marginBottom: 8 },
  tagGroup: { gap: 6 },
  tagGroupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scenesSection: { paddingHorizontal: 20, paddingTop: 24, gap: 4 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
});
