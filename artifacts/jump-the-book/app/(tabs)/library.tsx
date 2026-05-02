import { Feather } from "@expo/vector-icons";
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

import { BookCard } from "@/components/BookCard";
import NowReadingHero from "@/components/NowReadingHero";
import ScenesSection from "@/components/ScenesSection";
import SnapCoverButton from "@/components/SnapCoverButton";
import { useLibrary } from "@/context/LibraryContext";
import { DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";
import { useRemoteSceneLibrary } from "@/hooks/useRemoteLibrary";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userLibrary, removeBook } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  // Pick the most-recently active user book for the "Continue reading"
  // hero. Falls back to the most-recently-added book.
  const sceneLibQ = useRemoteSceneLibrary();
  const continueBook = React.useMemo(() => {
    if (userLibrary.length === 0) return null;
    const withProgress = userLibrary.filter((b) => (b.progress ?? 0) > 0);
    return (withProgress[0] ?? userLibrary[0]) as typeof userLibrary[number];
  }, [userLibrary]);
  const latestSceneForContinue = React.useMemo(() => {
    if (!continueBook) return null;
    const list = (sceneLibQ.data ?? [])
      .filter((s) => s.userBookId === continueBook.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    return list[0] ?? null;
  }, [sceneLibQ.data, continueBook]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Library</Text>
        <TouchableOpacity
          onPress={() => router.push("/discover")}
          style={[styles.discoverPill, { borderColor: colors.border, backgroundColor: colors.card }]}
          activeOpacity={0.85}
        >
          <Feather name="compass" size={13} color={colors.accent} />
          <Text style={[styles.discoverPillText, { color: colors.foreground }]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      {/* Continue reading hero — only when the user has a book in flight. */}
      {continueBook && (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <NowReadingHero book={continueBook} latestScene={latestSceneForContinue} />
        </View>
      )}

      {/* Recently generated scenes rail. */}
      <View style={{ paddingTop: continueBook ? 18 : 8 }}>
        <ScenesSection books={userLibrary.map((b) => ({ id: b.id, title: b.title }))} />
      </View>

      {/* Add-a-book duo: Upload EPUB + Snap a cover */}
      <View style={styles.heroWrap}>
        <TouchableOpacity
          style={[
            styles.heroBtn,
            { backgroundColor: colors.accent + "15", borderColor: colors.accent + "60" },
          ]}
          onPress={() => router.push("/upload")}
          activeOpacity={0.85}
        >
          <View style={[styles.heroIcon, { backgroundColor: colors.accent + "30" }]}>
            <Feather name="upload-cloud" size={22} color={colors.accent} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              Upload an EPUB
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              Drop in a book and we'll turn it into a comic or a movie.
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.accent} />
        </TouchableOpacity>

        {/* Snap a cover — point your camera at any physical book to add it. */}
        <View style={{ marginTop: 12 }}>
          <SnapCoverButton variant="tile" />
        </View>

        {/* Smart Setup — type it in and we'll build the bible. */}
        <TouchableOpacity
          style={[
            styles.heroBtn,
            { marginTop: 12, backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/setup-book")}
          activeOpacity={0.85}
        >
          <View style={[styles.heroIcon, { backgroundColor: colors.accent + "15" }]}>
            <Feather name="zap" size={20} color={colors.accent} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              Smart Book Setup
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              Type in any book and we'll build a story bible to ground every scene.
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Demo Library */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Demo Library</Text>
          <View style={[styles.badge, { backgroundColor: colors.gold + "20" }]}>
            <Text style={[styles.badgeText, { color: colors.gold }]}>Public Domain</Text>
          </View>
        </View>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          Try it out with a classic — no upload needed.
        </Text>
        {DEMO_BOOKS.map((book) => (
          <BookCard key={book.id} type="demo" book={book} />
        ))}
      </View>

      {/* My Books */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your books</Text>
          {userLibrary.length > 0 && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/upload")}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>
        {userLibrary.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="book-open" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Your library is empty
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Tap the upload button above to add your first book and start generating scenes.
            </Text>
          </View>
        ) : (
          userLibrary.map((book) => (
            <BookCard
              key={book.id}
              type="user"
              book={book}
              onDelete={() => removeBook(book.id)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  discoverPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  discoverPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heroWrap: { paddingHorizontal: 20, paddingTop: 16 },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },
});
