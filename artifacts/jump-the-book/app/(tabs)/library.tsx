import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { LibraryConnectModal } from "@/components/LibraryConnectModal";
import { useLibrary } from "@/context/LibraryContext";
import { DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userLibrary, removeBook } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;
  const [modal, setModal] = useState<"kindle" | "audible" | null>(null);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Library</Text>
        <View style={styles.connectBtns}>
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setModal("kindle")}
            activeOpacity={0.8}
          >
            <Feather name="book" size={14} color={colors.mutedForeground} />
            <Text style={[styles.connectText, { color: colors.mutedForeground }]}>Kindle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setModal("audible")}
            activeOpacity={0.8}
          >
            <Feather name="headphones" size={14} color={colors.mutedForeground} />
            <Text style={[styles.connectText, { color: colors.mutedForeground }]}>Audible</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Single Upload CTA — primary entry point */}
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
              Upload or add a book
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
              Drop in an EPUB or enter the details — we'll create your visual companion.
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.accent} />
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

      <LibraryConnectModal
        visible={modal !== null}
        onClose={() => setModal(null)}
        platform={modal}
      />
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
  connectBtns: { flexDirection: "row", gap: 8 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  connectText: { fontSize: 12, fontFamily: "Inter_500Medium" },
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
