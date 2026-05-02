import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import EditBookModal from "@/components/EditBookModal";
import { StreakBadge } from "@/components/StreakBadge";
import { useLibrary } from "@/context/LibraryContext";
import { useRemoteBooks } from "@/hooks/useRemoteLibrary";
import {
  Book,
  CHAPTERS,
  CHARACTERS,
  DEMO_BOOKS,
  UserLibraryItem,
  VISUAL_STYLE_LABELS,
} from "@/data/books";
import { useColors } from "@/hooks/useColors";

const HERO_IMAGES: Record<string, any> = {
  "alice-hero": require("../../assets/images/alice-hero.png"),
  "dracula-hero": require("../../assets/images/dracula-hero.png"),
  "frankenstein-hero": require("../../assets/images/frankenstein-hero.png"),
  "sherlock-hero": require("../../assets/images/sherlock-hero.png"),
};

interface NormalizedBook {
  id: string;
  title: string;
  author: string;
  format: string;
  tagline: string;
  coverGradient: string[];
  heroImage?: string;
  visualStyle: Book["visualStyle"];
  isUserBook: boolean;
}

function normalizeDemo(b: Book): NormalizedBook {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    format: b.format,
    tagline: b.tagline,
    coverGradient: b.coverGradient,
    heroImage: b.heroImage,
    visualStyle: b.visualStyle,
    isUserBook: false,
  };
}

function normalizeUser(b: UserLibraryItem): NormalizedBook {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    format: b.format,
    tagline: "Your reading companion",
    coverGradient: b.coverGradient,
    visualStyle: b.visualStyle,
    isUserBook: true,
  };
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getPosition, updatePosition, startSession, streak, userLibrary } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const [chapterPickerVisible, setChapterPickerVisible] = useState(false);
  const [chapterDraft, setChapterDraft] = useState("");
  const [editVisible, setEditVisible] = useState(false);

  // The Edit modal needs the canonical RemoteBook (it carries fields like
  // totalChapters that UserLibraryItem flattens). We pull it from the
  // already-cached remote books list — no extra fetch.
  const remoteBooksQ = useRemoteBooks();
  const remoteBookForEdit = remoteBooksQ.data?.find((b) => b.id === id) ?? null;

  const demoBook = DEMO_BOOKS.find((b) => b.id === id);
  const userBook = userLibrary.find((b) => b.id === id);
  const book: NormalizedBook | null = demoBook
    ? normalizeDemo(demoBook)
    : userBook
    ? normalizeUser(userBook)
    : null;

  const chapters = CHAPTERS[id ?? ""] ?? [];
  const characters = CHARACTERS[id ?? ""] ?? [];
  const firstChapter = chapters[0];
  const savedPos = getPosition(id ?? "");

  const currentChapter = savedPos
    ? chapters.find((c) => c.chapterNumber === savedPos.chapter) ?? firstChapter
    : firstChapter;

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Book not found</Text>
      </View>
    );
  }

  const launchExperience = async (mode: "comic" | "cinematic") => {
    const ch = currentChapter ?? firstChapter;
    if (ch) {
      await startSession(id!, book.title, ch.chapterNumber);
      router.push(`/experience/${id}?mode=${mode}&chapterId=${ch.id}`);
    } else {
      router.push(`/experience/${id}?mode=${mode}`);
    }
  };

  const saveChapter = async () => {
    const n = parseInt(chapterDraft, 10);
    if (!Number.isFinite(n) || n < 1) return;
    await updatePosition({
      bookId: id!,
      bookFormat: book.format,
      chapter: n,
      page: 1,
      timestamp: "00:00:00",
      percentComplete: chapters.length ? Math.round((n / chapters.length) * 100) : 0,
    });
    setChapterPickerVisible(false);
    setChapterDraft("");
  };

  const hasChapters = chapters.length > 0 || book.isUserBook;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover */}
      <View style={[styles.coverWrap, { paddingTop: topPad }]}>
        {book.heroImage && HERO_IMAGES[book.heroImage] ? (
          <Image source={HERO_IMAGES[book.heroImage]} style={styles.coverBg} resizeMode="cover" />
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
          {!book.isUserBook && <Badge label="Public Domain" variant="gold" />}
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          <Text style={styles.bookTagline}>{book.tagline}</Text>
        </View>
      </View>

      {/* ── Mode tiles ───────────────────────────────────────── */}
      <View style={styles.modeBlock}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          STEP INSIDE THE STORY
        </Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeTile, { opacity: hasChapters ? 1 : 0.5 }]}
            onPress={() => hasChapters && launchExperience("comic")}
            disabled={!hasChapters}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#1a1a4e", "#4a1a6e"]}
              style={styles.modeTileBg}
            >
              <View style={styles.modeTileIcon}>
                <Feather name="grid" size={24} color="#fff" />
              </View>
              <Text style={styles.modeTileTitle}>Comic</Text>
              <Text style={styles.modeTileDesc}>
                Vertical scroll of full-bleed AI-painted panels.
              </Text>
              <View style={styles.modeTileBtn}>
                <Text style={styles.modeTileBtnText}>
                  {book.isUserBook && !chapters.length ? "Generate" : "Open"}
                </Text>
                <Feather name="arrow-right" size={13} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTile, { opacity: hasChapters ? 1 : 0.5 }]}
            onPress={() => hasChapters && launchExperience("cinematic")}
            disabled={!hasChapters}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#0a0a1a", "#1a1a3a"]}
              style={styles.modeTileBg}
            >
              <View style={styles.modeTileIcon}>
                <Feather name="film" size={24} color="#fff" />
              </View>
              <Text style={styles.modeTileTitle}>Cinematic</Text>
              <Text style={styles.modeTileDesc}>
                Full-screen swipe-through with overlay narration.
              </Text>
              <View style={styles.modeTileBtn}>
                <Text style={styles.modeTileBtnText}>
                  {book.isUserBook && !chapters.length ? "Generate" : "Open"}
                </Text>
                <Feather name="arrow-right" size={13} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Pick up at chapter chip ────────────────────────────── */}
      {chapters.length > 0 && (
        <View style={styles.pickupRow}>
          <TouchableOpacity
            style={[
              styles.pickupChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              setChapterDraft(String(savedPos?.chapter ?? 1));
              setChapterPickerVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Feather name="bookmark" size={14} color={colors.mutedForeground} />
            <Text style={[styles.pickupText, { color: colors.foreground }]}>
              {savedPos
                ? `Continuing from chapter ${savedPos.chapter}`
                : "Pick up at chapter…"}
            </Text>
            <Feather name="edit-2" size={12} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Streak ───────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <StreakBadge streak={streak} />
      </View>

      {/* ── Smart-setup / Edit row (user books only) ─────────── */}
      {book.isUserBook && (
        <View style={styles.userActionRow}>
          <TouchableOpacity
            style={[
              styles.userActionBtn,
              { borderColor: colors.accent + "60", backgroundColor: colors.accent + "10" },
            ]}
            onPress={() => router.push(`/setup-book?bookId=${encodeURIComponent(id!)}`)}
            activeOpacity={0.85}
          >
            <Feather name="zap" size={13} color={colors.accent} />
            <Text style={[styles.userActionText, { color: colors.accent }]}>
              Edit story bible
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.userActionBtn,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={() => setEditVisible(true)}
            disabled={!remoteBookForEdit}
            activeOpacity={0.85}
          >
            <Feather name="edit-2" size={13} color={colors.foreground} />
            <Text style={[styles.userActionText, { color: colors.foreground }]}>
              Edit details
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <EditBookModal
        visible={editVisible}
        book={remoteBookForEdit}
        onClose={() => setEditVisible(false)}
      />

      {/* ── Meta ─────────────────────────────────────────────── */}
      <View
        style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Format</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{book.format}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Chapters</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {chapters.length || (book.isUserBook ? "1+" : "—")}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Characters</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {characters.length || "—"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Style</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {VISUAL_STYLE_LABELS[book.visualStyle]}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Chapter list (read-only navigation) ──────────────── */}
      {chapters.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chapters</Text>
          {chapters.slice(0, 8).map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              style={[
                styles.chapterItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push(`/experience/${id}?mode=comic&chapterId=${chapter.id}`)}
              activeOpacity={0.85}
            >
              <View style={[styles.chapterNum, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.chapterNumText, { color: colors.primary }]}>
                  {chapter.chapterNumber}
                </Text>
              </View>
              <View style={styles.chapterInfo}>
                <Text style={[styles.chapterTitle, { color: colors.foreground }]}>
                  {chapter.title}
                </Text>
                <Text
                  style={[styles.chapterSummary, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {chapter.summary}
                </Text>
                <Text style={[styles.sceneCount, { color: colors.accent }]}>
                  {chapter.scenes.length} scene{chapter.scenes.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── User-book empty state for chapter list ─────────────── */}
      {book.isUserBook && chapters.length === 0 && (
        <View style={styles.section}>
          <View style={[styles.emptyChapters, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyChaptersIcon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="zap" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.emptyChaptersTitle, { color: colors.foreground }]}>
              First chapter ready to generate
            </Text>
            <Text style={[styles.emptyChaptersDesc, { color: colors.mutedForeground }]}>
              Pick Comic or Cinematic above and we'll paint chapter 1 in about a minute.
            </Text>
          </View>
        </View>
      )}

      {/* ── Pick chapter modal ───────────────────────────────── */}
      <Modal
        visible={chapterPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChapterPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setChapterPickerVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Pick up at chapter…</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Set where you are in the book. Optional — we'll show you the start of the chapter.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Chapter number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={chapterDraft}
              onChangeText={setChapterDraft}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtnGhost, { borderColor: colors.border }]}
                onPress={() => setChapterPickerVisible(false)}
              >
                <Text style={[styles.modalBtnGhostText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveChapter}
              >
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  coverWrap: { height: 380, position: "relative" },
  coverBg: { ...StyleSheet.absoluteFillObject },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
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
  coverInfo: { position: "absolute", bottom: 24, left: 20, right: 20, gap: 6 },
  bookTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  bookAuthor: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  bookTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    fontStyle: "italic",
  },

  modeBlock: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeTile: { flex: 1, borderRadius: 18, overflow: "hidden" },
  modeTileBg: { padding: 16, gap: 8, minHeight: 175 },
  modeTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTileTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  modeTileDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 17,
    flex: 1,
  },
  modeTileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignSelf: "flex-start",
  },
  modeTileBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  pickupRow: { paddingHorizontal: 20, paddingTop: 14 },
  pickupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickupText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },

  userActionRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  userActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  userActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metaCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaItem: { alignItems: "center", gap: 4 },
  metaLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  section: { paddingHorizontal: 20, paddingTop: 22, gap: 10 },
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

  emptyChapters: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyChaptersIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChaptersTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyChaptersDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 12, maxWidth: 400, width: "100%" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnGhostText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
