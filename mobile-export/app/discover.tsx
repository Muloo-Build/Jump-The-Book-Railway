import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
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

import { useLibrary } from "@/context/LibraryContext";
import { DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";
import {
  useIsSignedIn,
  useRemoteBooks,
  useRemoteSceneLibrary,
} from "@/hooks/useRemoteLibrary";

const HERO_IMAGES: Record<string, any> = {
  "alice-hero": require("../assets/images/alice-hero.png"),
  "dracula-hero": require("../assets/images/dracula-hero.png"),
  "frankenstein-hero": require("../assets/images/frankenstein-hero.png"),
  "sherlock-hero": require("../assets/images/sherlock-hero.png"),
};

interface Category {
  id: string;
  title: string;
  subtitle: string;
  bookIds: string[];
}

// Curated demo categories — kept in lockstep with web/discover.
const CATEGORIES: Category[] = [
  {
    id: "wonder",
    title: "Wonder & whimsy",
    subtitle: "Fantastical worlds with a soft glow",
    bookIds: ["alice"],
  },
  {
    id: "shadow",
    title: "Shadow & dread",
    subtitle: "Gothic, candlelit, slow-burn unease",
    bookIds: ["dracula", "frankenstein"],
  },
  {
    id: "case",
    title: "Cases to crack",
    subtitle: "Foggy streets, sharp minds",
    bookIds: ["sherlock"],
  },
];

/**
 * Mobile mirror of the web's `/discover` page.
 *
 * Three sections: a "Bring your own" duo (Smart Setup + Upload),
 * "Most explored" tiles ranked by per-book scene counts (only when
 * signed in and the user has scenes), and curated demo-book categories.
 * Lives outside the tab bar so it stays a one-off browse surface — the
 * Library tab is the user's home.
 */
export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isSignedIn = useIsSignedIn();
  const remoteBooksQ = useRemoteBooks();
  const sceneLibQ = useRemoteSceneLibrary();
  // Local-only library is also valid context for "most explored" titles
  // when we don't yet have remote data hydrated, so fall back to it.
  const { userLibrary } = useLibrary();

  const explored = useMemo(() => {
    const titleById = new Map<string, string>();
    for (const b of remoteBooksQ.data ?? []) titleById.set(b.id, b.title);
    for (const b of userLibrary) titleById.set(b.id, b.title);
    const liveIds = new Set(titleById.keys());

    const counts = new Map<string, number>();
    for (const s of sceneLibQ.data ?? []) {
      if (!liveIds.has(s.userBookId)) continue;
      counts.set(s.userBookId, (counts.get(s.userBookId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, n]) => ({ id, count: n, title: titleById.get(id) ?? "Book" }));
  }, [sceneLibQ.data, remoteBooksQ.data, userLibrary]);

  const totalScenes = explored.reduce((sum, e) => sum + e.count, 0);

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;
  const bottomPad = insets.bottom + 24;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.eyebrowRow}>
            <Feather name="compass" size={12} color={colors.accent} />
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              DISCOVER
            </Text>
          </View>
          <Text style={[styles.h1, { color: colors.foreground }]}>
            Find your next scene.
          </Text>
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Browse our curated catalog, jump into a public-domain classic, or
            bring any book of your own.
          </Text>
        </View>
      </View>

      {/* Bring your own */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => router.push("/setup-book")}
          style={[
            styles.brickPrimary,
            { borderColor: colors.accent + "55", backgroundColor: colors.accent + "10" },
          ]}
          activeOpacity={0.85}
        >
          <View style={[styles.brickIcon, { backgroundColor: colors.accent + "25" }]}>
            <Feather name="zap" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brickEyebrow, { color: colors.accent }]}>
              SMART SETUP
            </Text>
            <Text style={[styles.brickTitle, { color: colors.foreground }]}>
              Add a modern book by title
            </Text>
            <Text style={[styles.brickSub, { color: colors.mutedForeground }]}>
              We'll build a spoiler-safe story profile so the scenes match what
              you've read.
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/upload")}
          style={[
            styles.brickPrimary,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          activeOpacity={0.85}
        >
          <View style={[styles.brickIcon, { backgroundColor: colors.background }]}>
            <Feather name="upload" size={18} color={colors.foreground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brickEyebrow, { color: colors.mutedForeground }]}>
              UPLOAD A FILE
            </Text>
            <Text style={[styles.brickTitle, { color: colors.foreground }]}>
              Drop in an EPUB
            </Text>
            <Text style={[styles.brickSub, { color: colors.mutedForeground }]}>
              We'll parse the chapters and let you visualize any one of them.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {isSignedIn && totalScenes > 0 && (
        <View style={styles.section}>
          <SectionHeader colors={colors} title="Most explored" sub="Books you've turned into the most cinematic moments" />
          <View style={styles.exploredGrid}>
            {explored.map((e) => (
              <TouchableOpacity
                key={e.id}
                onPress={() => router.push(`/book/${e.id}`)}
                activeOpacity={0.85}
                style={[
                  styles.exploredCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <Text style={[styles.exploredCount, { color: colors.foreground }]}>
                  {e.count}
                </Text>
                <Text
                  style={[styles.exploredScenes, { color: colors.mutedForeground }]}
                >
                  SCENES
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.exploredTitle, { color: colors.foreground }]}
                >
                  {e.title}
                </Text>
                <Text style={[styles.exploredOpen, { color: colors.accent }]}>
                  Open →
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {CATEGORIES.map((cat) => {
        const books = cat.bookIds
          .map((id) => DEMO_BOOKS.find((b) => b.id === id))
          .filter((b): b is (typeof DEMO_BOOKS)[number] => !!b);
        if (books.length === 0) return null;
        return (
          <View key={cat.id} style={styles.section}>
            <SectionHeader colors={colors} title={cat.title} sub={cat.subtitle} />
            <View style={styles.demoGrid}>
              {books.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  onPress={() => router.push(`/book/${book.id}`)}
                  activeOpacity={0.85}
                  style={[
                    styles.demoCard,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <View style={styles.demoCover}>
                    <LinearGradient
                      colors={book.coverGradient as [string, string, ...string[]]}
                      style={StyleSheet.absoluteFill}
                    />
                    {book.heroImage && HERO_IMAGES[book.heroImage] && (
                      <Image
                        source={HERO_IMAGES[book.heroImage]}
                        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  <View style={styles.demoBody}>
                    <Text numberOfLines={1} style={[styles.demoTitle, { color: colors.foreground }]}>
                      {book.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.demoAuthor, { color: colors.mutedForeground }]}>
                      {book.author}
                    </Text>
                    {book.tagline ? (
                      <Text numberOfLines={1} style={[styles.demoTagline, { color: colors.accent }]}>
                        {book.tagline}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Footer CTA */}
      <View style={styles.section}>
        <View
          style={[
            styles.footerCta,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather name="zap" size={16} color={colors.accent} />
          <Text style={[styles.footerCtaText, { color: colors.mutedForeground }]}>
            Don't see what you're reading? Add it with Smart Setup and we'll
            build a spoiler-safe profile so every scene fits the story.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/setup-book")}
            style={[styles.footerCtaBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.footerCtaBtnText, { color: "#08081a" }]}>
              Open Smart Setup
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  colors,
  title,
  sub,
}: {
  colors: ReturnType<typeof useColors>;
  title: string;
  sub: string;
}) {
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionHeaderTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.sectionHeaderSub, { color: colors.mutedForeground }]}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 6 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  h1: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 4, lineHeight: 32 },
  intro: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 6 },
  section: { paddingHorizontal: 16, gap: 10, paddingTop: 12 },
  brickPrimary: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  brickIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  brickEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  brickTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  brickSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4 },
  sectionHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 2,
  },
  sectionHeaderTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionHeaderSub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  exploredGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  exploredCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 120,
  },
  exploredCount: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
  exploredScenes: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4, marginTop: 4 },
  exploredTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 8, lineHeight: 17 },
  exploredOpen: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  demoCard: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  demoCover: { aspectRatio: 2 / 3, position: "relative", overflow: "hidden" },
  demoBody: { padding: 10, gap: 2 },
  demoTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  demoAuthor: { fontSize: 11, fontFamily: "Inter_500Medium" },
  demoTagline: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  footerCta: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  footerCtaText: { fontSize: 12, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" },
  footerCtaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerCtaBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
