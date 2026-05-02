import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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

import { useColors } from "@/hooks/useColors";
import { DEMO_BOOKS, CHAPTERS } from "@/data/books";

export default function ImmersionTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Immersion</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
          Step inside a story
        </Text>
      </View>

      {/* Featured */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FEATURED EXPERIENCE</Text>
        <TouchableOpacity
          onPress={() => router.push("/immersion-mode?bookId=alice&chapterId=alice-ch1")}
          activeOpacity={0.9}
          style={styles.featuredCard}
        >
          <LinearGradient
            colors={["#1a1a4e", "#4a1a6e", "#8b5cf6"]}
            style={styles.featuredGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.featuredOverlay} />
            <View style={styles.featuredContent}>
              <View style={[styles.liveTag, { backgroundColor: colors.gold + "20" }]}>
                <Feather name="sparkles" size={11} color={colors.gold} />
                <Text style={[styles.liveTagText, { color: colors.gold }]}>6 Scenes</Text>
              </View>
              <Text style={styles.featuredTitle}>Alice in Wonderland</Text>
              <Text style={styles.featuredChapter}>Chapter 1 — Down the Rabbit Hole</Text>
              <TouchableOpacity
                style={[styles.enterBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/immersion-mode?bookId=alice&chapterId=alice-ch1")}
                activeOpacity={0.85}
              >
                <Feather name="maximize" size={16} color={colors.primaryForeground} />
                <Text style={[styles.enterBtnText, { color: colors.primaryForeground }]}>
                  Enter Immersion Mode
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* All books */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALL STORIES</Text>
        <View style={styles.bookGrid}>
          {DEMO_BOOKS.map((book) => {
            const chapters = CHAPTERS[book.id] ?? [];
            const firstChapter = chapters[0];
            return (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => firstChapter && router.push(`/immersion-mode?bookId=${book.id}&chapterId=${firstChapter.id}`)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={book.coverGradient as [string, string, ...string[]]}
                  style={styles.bookThumb}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.bookInitial}>{book.title[0]}</Text>
                </LinearGradient>
                <View style={styles.bookInfo}>
                  <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={1}>{book.title}</Text>
                  <Text style={[styles.bookAuthor, { color: colors.mutedForeground }]}>{book.author}</Text>
                  <Text style={[styles.bookChapters, { color: colors.accent }]}>
                    {chapters.length} chapters available
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.tipBox, { backgroundColor: colors.card, borderColor: colors.accent + "30", marginHorizontal: 20, marginTop: 16 }]}>
        <Feather name="info" size={16} color={colors.accent} />
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
          Open any book chapter and tap "Enter Immersion Mode" for a full-screen cinematic experience.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 8, gap: 4 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  featuredCard: { borderRadius: 24, overflow: "hidden" },
  featuredGradient: { height: 260 },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  featuredContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, gap: 8 },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  liveTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  featuredTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  featuredChapter: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  enterBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bookGrid: { gap: 10 },
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  bookThumb: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bookInitial: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  bookInfo: { flex: 1, gap: 2 },
  bookTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bookAuthor: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bookChapters: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tipBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start", marginBottom: 8 },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
