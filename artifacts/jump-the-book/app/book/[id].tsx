import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import { CHAPTERS, CHARACTERS, DEMO_BOOKS, VISUAL_STYLE_LABELS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const HERO_IMAGES: Record<string, any> = {
  "alice-hero": require("../../assets/images/alice-hero.png"),
  "dracula-hero": require("../../assets/images/dracula-hero.png"),
  "frankenstein-hero": require("../../assets/images/frankenstein-hero.png"),
  "sherlock-hero": require("../../assets/images/sherlock-hero.png"),
};

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const book = DEMO_BOOKS.find((b) => b.id === id);
  const chapters = CHAPTERS[id ?? ""] ?? [];
  const characters = CHARACTERS[id ?? ""] ?? [];
  const firstChapter = chapters[0];

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Book not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover */}
      <View style={[styles.coverWrap, { paddingTop: topPad }]}>
        {book.heroImage && HERO_IMAGES[book.heroImage] ? (
          <Image
            source={HERO_IMAGES[book.heroImage]}
            style={styles.coverBg}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={book.coverGradient as [string, string, ...string[]]}
            style={styles.coverBg}
          />
        )}
        <View style={styles.coverOverlay} />
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: "rgba(0,0,0,0.4)" }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.coverInfo}>
          <Badge label="Public Domain" variant="gold" />
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          <Text style={styles.bookTagline}>{book.tagline}</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={[styles.quickActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "Continue Journey", icon: "play", action: () => firstChapter && router.push(`/chapter/${firstChapter.id}`), primary: true },
          { label: "Immersion Mode", icon: "maximize", action: () => firstChapter && router.push(`/immersion-mode?bookId=${book.id}&chapterId=${firstChapter.id}`), primary: false },
          { label: "Characters", icon: "users", action: () => router.push("/(tabs)/characters"), primary: false },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={[
              styles.quickBtn,
              {
                backgroundColor: btn.primary ? colors.primary : colors.muted,
                flex: btn.primary ? 2 : 1,
              },
            ]}
            onPress={btn.action}
            activeOpacity={0.85}
          >
            <Feather
              name={btn.icon as any}
              size={16}
              color={btn.primary ? colors.primaryForeground : colors.foreground}
            />
            <Text
              style={[
                styles.quickBtnText,
                { color: btn.primary ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Meta */}
      <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Format</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{book.format}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Chapters</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{chapters.length}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Characters</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{characters.length}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Style</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {VISUAL_STYLE_LABELS[book.visualStyle]}
            </Text>
          </View>
        </View>
      </View>

      {/* Chapters */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chapters</Text>
        {chapters.map((chapter) => (
          <TouchableOpacity
            key={chapter.id}
            style={[styles.chapterItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/chapter/${chapter.id}`)}
            activeOpacity={0.85}
          >
            <View style={[styles.chapterNum, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.chapterNumText, { color: colors.primary }]}>
                {chapter.chapterNumber}
              </Text>
            </View>
            <View style={styles.chapterInfo}>
              <Text style={[styles.chapterTitle, { color: colors.foreground }]}>{chapter.title}</Text>
              <Text style={[styles.chapterSummary, { color: colors.mutedForeground }]} numberOfLines={2}>
                {chapter.summary}
              </Text>
              <Text style={[styles.sceneCount, { color: colors.accent }]}>
                {chapter.scenes.length} scenes
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  coverWrap: { height: 380, position: "relative" },
  coverBg: { ...StyleSheet.absoluteFillObject },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  coverInfo: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    gap: 6,
  },
  bookTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  bookAuthor: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  bookTagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", fontStyle: "italic" },
  quickActions: {
    flexDirection: "row",
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 5,
  },
  quickBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metaCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaItem: { alignItems: "center", gap: 4 },
  metaLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 10 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  chapterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  chapterNum: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterNumText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  chapterInfo: { flex: 1, gap: 2 },
  chapterTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chapterSummary: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sceneCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
