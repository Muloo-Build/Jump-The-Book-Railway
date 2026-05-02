import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HERO_IMAGES: Record<string, any> = {
  "alice-hero": require("../../assets/images/alice-hero.png"),
  "dracula-hero": require("../../assets/images/dracula-hero.png"),
  "frankenstein-hero": require("../../assets/images/frankenstein-hero.png"),
  "sherlock-hero": require("../../assets/images/sherlock-hero.png"),
};

const HOW_IT_WORKS = [
  { icon: "book", step: "01", title: "Choose or add a book", desc: "Pick from our demo classics or add your own current read." },
  { icon: "map-pin", step: "02", title: "Tell us where you are", desc: "Set your chapter, page or timestamp — no spoilers." },
  { icon: "image", step: "03", title: "Generate visual scenes", desc: "Spoiler-safe scene cards appear for your exact place in the story." },
  { icon: "layers", step: "04", title: "Swipe your companion", desc: "Explore characters, locations, mood and immersive panels." },
];

const COMING_SOON = [
  "Kindle and Audible progress sync",
  "Real AI image generation",
  "Voice narration",
  "Author manuscript mode",
  "Book club rooms",
  "Classroom mode",
  "Export as storyboard",
  "Interactive character maps",
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={["#12122e", "#1a1a4e", "#0a0a1a"]}
        style={[styles.hero, { paddingTop: topPad + 24 }]}
      >
        <View style={[styles.logoPill, { backgroundColor: colors.gold + "20", borderColor: colors.gold + "40" }]}>
          <Text style={[styles.logoText, { color: colors.gold }]}>JUMP THE BOOK</Text>
        </View>
        <Text style={styles.heroHeadline}>Don't just read the story.{"\n"}Step inside it.</Text>
        <Text style={[styles.heroSub, { color: "rgba(240,230,211,0.7)" }]}>
          Turn your current read into visual scenes, character guides and immersive story moments.
        </Text>
        <View style={styles.heroBtns}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/book/alice")}
            activeOpacity={0.85}
          >
            <Feather name="play" size={16} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              Start Demo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/add-book")}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              Add My Current Read
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Preview carousel */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Demo Library
        </Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          Explore public domain classics without copyright restrictions.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {DEMO_BOOKS.map((book) => (
            <TouchableOpacity
              key={book.id}
              style={[styles.carouselCard, { borderColor: colors.border }]}
              onPress={() => router.push(`/book/${book.id}`)}
              activeOpacity={0.85}
            >
              {book.heroImage && HERO_IMAGES[book.heroImage] ? (
                <Image
                  source={HERO_IMAGES[book.heroImage]}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={book.coverGradient as [string, string, ...string[]]}
                  style={styles.carouselImage}
                />
              )}
              <View style={styles.carouselOverlay} />
              <View style={styles.carouselInfo}>
                <Text style={styles.carouselTitle} numberOfLines={2}>{book.title}</Text>
                <Text style={styles.carouselAuthor}>{book.author}</Text>
                <Text style={styles.carouselTagline}>{book.tagline}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* How it works */}
      <View style={[styles.section, styles.howSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How it works</Text>
        <View style={styles.steps}>
          {HOW_IT_WORKS.map((item) => (
            <View key={item.step} style={styles.step}>
              <View style={[styles.stepLeft, { backgroundColor: colors.primary + "20" }]}>
                <Feather name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.stepRight}>
                <View style={styles.stepTop}>
                  <Text style={[styles.stepNum, { color: colors.mutedForeground }]}>{item.step}</Text>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>{item.title}</Text>
                </View>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Coming soon */}
      <View style={styles.section}>
        <View style={[styles.comingSoonHeader, { borderColor: colors.accent + "40" }]}>
          <View style={[styles.sparkBadge, { backgroundColor: colors.accent + "20" }]}>
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.sparkText, { color: colors.accent }]}>Coming Soon</Text>
          </View>
        </View>
        <View style={styles.comingGrid}>
          {COMING_SOON.map((item) => (
            <View key={item} style={[styles.comingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.comingText, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const CARD_W = SCREEN_WIDTH * 0.68;

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
  logoPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  heroHeadline: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#f0e6d3",
    lineHeight: 42,
  },
  heroSub: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26 },
  heroBtns: { flexDirection: "column", gap: 12, marginTop: 8 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  section: { paddingHorizontal: 20, paddingTop: 32, gap: 12 },
  howSection: { paddingVertical: 32, marginTop: 8 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  carousel: { paddingRight: 20, gap: 12, paddingTop: 4 },
  carouselCard: {
    width: CARD_W,
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  carouselImage: { width: "100%", height: "100%" },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    backgroundImage: undefined,
  },
  carouselInfo: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    gap: 2,
  },
  carouselTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  carouselAuthor: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  carouselTagline: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 4 },
  steps: { gap: 20 },
  step: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepLeft: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepRight: { flex: 1, gap: 4 },
  stepTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepNum: { fontSize: 12, fontFamily: "Inter_700Bold" },
  stepTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  comingSoonHeader: { paddingBottom: 12, borderBottomWidth: 1 },
  sparkBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" },
  sparkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  comingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  comingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  comingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
