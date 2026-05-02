import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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

import { useColors } from "@/hooks/useColors";
import { DEMO_BOOKS, CHAPTERS } from "@/data/books";

const HERO_IMAGES: Record<string, any> = {
  "alice-hero": require("../../assets/images/alice-hero.png"),
  "dracula-hero": require("../../assets/images/dracula-hero.png"),
  "frankenstein-hero": require("../../assets/images/frankenstein-hero.png"),
  "sherlock-hero": require("../../assets/images/sherlock-hero.png"),
};

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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Step Inside</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
          Read it as a comic, or watch it as a movie
        </Text>
      </View>

      {/* Featured */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FEATURED</Text>
        <TouchableOpacity
          onPress={() => router.push("/experience/alice?mode=cinematic")}
          activeOpacity={0.9}
          style={styles.featuredCard}
        >
          <Image
            source={HERO_IMAGES["alice-hero"]}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.featuredContent}>
            <View style={[styles.liveTag, { backgroundColor: colors.gold + "25" }]}>
              <Feather name="zap" size={11} color={colors.gold} />
              <Text style={[styles.liveTagText, { color: colors.gold }]}>6 Scenes</Text>
            </View>
            <Text style={styles.featuredTitle}>Alice in Wonderland</Text>
            <Text style={styles.featuredChapter}>Chapter 1 — Down the Rabbit Hole</Text>
            <View style={styles.featuredBtns}>
              <TouchableOpacity
                style={[styles.enterBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/experience/alice?mode=cinematic")}
                activeOpacity={0.85}
              >
                <Feather name="film" size={14} color={colors.primaryForeground} />
                <Text style={[styles.enterBtnText, { color: colors.primaryForeground }]}>
                  Cinematic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.enterBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                onPress={() => router.push("/experience/alice?mode=comic")}
                activeOpacity={0.85}
              >
                <Feather name="grid" size={14} color="#fff" />
                <Text style={[styles.enterBtnText, { color: "#fff" }]}>Comic</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* All books */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALL STORIES</Text>
        <View style={styles.bookGrid}>
          {DEMO_BOOKS.map((book) => {
            const chapters = CHAPTERS[book.id] ?? [];
            return (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/experience/${book.id}?mode=comic`)}
                activeOpacity={0.85}
              >
                {book.heroImage && HERO_IMAGES[book.heroImage] ? (
                  <Image source={HERO_IMAGES[book.heroImage]} style={styles.bookThumb} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={book.coverGradient as [string, string, ...string[]]}
                    style={styles.bookThumb}
                  >
                    <Text style={styles.bookInitial}>{book.title[0]}</Text>
                  </LinearGradient>
                )}
                <View style={styles.bookInfo}>
                  <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text style={[styles.bookAuthor, { color: colors.mutedForeground }]}>
                    {book.author}
                  </Text>
                  <Text style={[styles.bookChapters, { color: colors.accent }]}>
                    {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ready
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.tipBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.accent + "30",
            marginHorizontal: 20,
            marginTop: 16,
          },
        ]}
      >
        <Feather name="info" size={16} color={colors.accent} />
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
          Both modes show real AI-painted scene art. Tap the toggle inside any experience to switch
          on the fly.
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
  featuredCard: { borderRadius: 24, overflow: "hidden", height: 280 },
  featuredContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, gap: 8 },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  liveTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  featuredTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  featuredChapter: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  featuredBtns: { flexDirection: "row", gap: 8, marginTop: 8 },
  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  enterBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bookGrid: { gap: 10 },
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  bookThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bookInitial: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  bookInfo: { flex: 1, gap: 2 },
  bookTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bookAuthor: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bookChapters: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tipBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
