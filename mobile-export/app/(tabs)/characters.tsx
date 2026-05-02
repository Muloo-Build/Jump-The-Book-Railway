import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

import { CharacterCard } from "@/components/CharacterCard";
import { CHARACTERS, DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

export default function CharactersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;
  const [selectedBookId, setSelectedBookId] = useState("alice");

  const characters = CHARACTERS[selectedBookId] ?? [];
  const selectedBook = DEMO_BOOKS.find((b) => b.id === selectedBookId);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Characters</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
          Track the people inside your story
        </Text>
      </View>

      {/* Book picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pickerScroll}
        contentContainerStyle={styles.pickerContent}
      >
        {DEMO_BOOKS.map((book) => {
          const active = book.id === selectedBookId;
          return (
            <TouchableOpacity
              key={book.id}
              style={[
                styles.pickerItem,
                {
                  backgroundColor: active ? colors.primary + "20" : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedBookId(book.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={book.coverGradient as [string, string, ...string[]]}
                style={styles.pickerThumb}
              >
                <Text style={styles.pickerInitial}>{book.title[0]}</Text>
              </LinearGradient>
              <Text
                style={[
                  styles.pickerLabel,
                  { color: active ? colors.primary : colors.foreground },
                ]}
                numberOfLines={2}
              >
                {book.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Count */}
      {selectedBook && (
        <View style={styles.countRow}>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
            {characters.length} characters in{" "}
          </Text>
          <Text style={[styles.countBook, { color: colors.foreground }]}>
            {selectedBook.title}
          </Text>
        </View>
      )}

      {/* Character cards */}
      <View style={styles.cards}>
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} />
        ))}
      </View>

      {characters.length === 0 && (
        <View style={styles.empty}>
          <Feather name="users" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No characters for this book yet
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 8, gap: 4 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  pickerScroll: { marginTop: 16 },
  pickerContent: { paddingHorizontal: 20, gap: 10 },
  pickerItem: {
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    width: 100,
  },
  pickerThumb: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pickerInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  pickerLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  countRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginTop: 20, marginBottom: 4 },
  countLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  countBook: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cards: { paddingHorizontal: 20, paddingTop: 12, gap: 0 },
  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
