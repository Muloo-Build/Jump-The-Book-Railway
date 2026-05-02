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
import { EmptyState } from "@/components/EmptyState";
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

      {/* Demo Library */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Demo Library</Text>
          <View style={[styles.badge, { backgroundColor: colors.gold + "20" }]}>
            <Text style={[styles.badgeText, { color: colors.gold }]}>Public Domain</Text>
          </View>
        </View>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          Explore public domain classics without copyright restrictions.
        </Text>
        {DEMO_BOOKS.map((book) => (
          <BookCard key={book.id} type="demo" book={book} />
        ))}
      </View>

      {/* My Current Reads */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Current Reads</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/add-book")}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
        {userLibrary.length === 0 ? (
          <EmptyState
            icon="book-open"
            title="No books added yet"
            description="Add a book you're currently reading to generate a visual companion."
            actionLabel="Add My Current Read"
            onAction={() => router.push("/add-book")}
          />
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

      {/* My Own Writing */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Own Writing</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push("/upload-writing")}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.writingCard, { backgroundColor: colors.card, borderColor: colors.accent + "40" }]}>
          <Feather name="edit-3" size={24} color={colors.accent} />
          <Text style={[styles.writingTitle, { color: colors.foreground }]}>Paste your own writing</Text>
          <Text style={[styles.writingDesc, { color: colors.mutedForeground }]}>
            Paste your own writing and turn it into an immersive visual companion. Perfect for authors, creators and storytellers.
          </Text>
          <TouchableOpacity
            style={[styles.writingBtn, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "40" }]}
            onPress={() => router.push("/upload-writing")}
            activeOpacity={0.8}
          >
            <Text style={[styles.writingBtnText, { color: colors.accent }]}>Upload Writing</Text>
          </TouchableOpacity>
        </View>
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
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  writingCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  writingTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  writingDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center" },
  writingBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  writingBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
