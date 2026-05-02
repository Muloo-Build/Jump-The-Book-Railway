import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
import { PositionEntry } from "@/components/PositionEntry";
import { SessionRecap } from "@/components/SessionRecap";
import { StreakBadge } from "@/components/StreakBadge";
import { useLibrary, BookPosition } from "@/context/LibraryContext";
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
  const {
    getPosition,
    updatePosition,
    startSession,
    streak,
    sessions,
    userLibrary,
  } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const [positionVisible, setPositionVisible] = useState(false);
  const [recapVisible, setRecapVisible] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);

  // Look up in BOTH demo books and user library
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
  const lastSession = sessions.find((s) => s.bookId === id && s.endedAt);

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

  const handleSavePosition = async (pos: Omit<BookPosition, "lastUpdated">) => {
    await updatePosition(pos);
  };

  const handleStartSession = async () => {
    const ch = currentChapter ?? firstChapter;
    if (!ch) return;
    await startSession(id!, book.title, ch.chapterNumber);
    router.push(`/chapter/${ch.id}`);
  };

  // Show first 5 chapters by default; expand to all
  const visibleChapters = showAllChapters ? chapters : chapters.slice(0, 5);
  const hasMoreChapters = chapters.length > 5;
  const hasChapters = chapters.length > 0;

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

      {/* Position widget */}
      <TouchableOpacity
        style={[
          styles.positionWidget,
          {
            backgroundColor: colors.card,
            borderColor: savedPos ? colors.primary + "50" : colors.border,
          },
        ]}
        onPress={() => setPositionVisible(true)}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.posIconWrap,
            { backgroundColor: savedPos ? colors.primary + "20" : colors.muted },
          ]}
        >
          <Feather
            name="map-pin"
            size={18}
            color={savedPos ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={styles.posInfo}>
          {savedPos ? (
            <>
              <Text style={[styles.posTitle, { color: colors.foreground }]}>
                {book.format === "Audible"
                  ? `Timestamp: ${savedPos.timestamp}`
                  : `Chapter ${savedPos.chapter}, Page ${savedPos.page}`}
              </Text>
              <Text style={[styles.posSub, { color: colors.mutedForeground }]}>
                ~{savedPos.percentComplete}% through · tap to update
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.posTitle, { color: colors.foreground }]}>
                Where are you?
              </Text>
              <Text style={[styles.posSub, { color: colors.mutedForeground }]}>
                Set your position to unlock spoiler-safe scenes
              </Text>
            </>
          )}
        </View>
        <Feather name="edit-2" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Progress bar */}
      {savedPos && savedPos.percentComplete > 0 && (
        <View style={[styles.progressRow, { paddingHorizontal: 20 }]}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${savedPos.percentComplete}%` as any },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {savedPos.percentComplete}%
          </Text>
        </View>
      )}

      {/* Quick actions */}
      <View
        style={[styles.quickActions, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <TouchableOpacity
          style={[
            styles.quickBtnPrimary,
            { backgroundColor: colors.primary, opacity: hasChapters ? 1 : 0.5 },
          ]}
          onPress={handleStartSession}
          disabled={!hasChapters}
          activeOpacity={0.85}
        >
          <Feather name="play" size={16} color={colors.primaryForeground} />
          <Text style={[styles.quickBtnText, { color: colors.primaryForeground }]}>
            {!hasChapters
              ? "Scenes coming soon"
              : savedPos
              ? `Continue reading · Ch ${savedPos.chapter}`
              : "Start reading"}
          </Text>
        </TouchableOpacity>
        {hasChapters && (
          <View style={styles.quickSecondary}>
            <TouchableOpacity
              style={[styles.quickBtnSmall, { backgroundColor: colors.muted }]}
              onPress={() =>
                firstChapter &&
                router.push(
                  `/ambient-companion?bookId=${book.id}&chapterId=${currentChapter?.id ?? firstChapter.id}`
                )
              }
              activeOpacity={0.85}
            >
              <Feather name="eye" size={14} color={colors.foreground} />
              <Text style={[styles.quickBtnTextSm, { color: colors.foreground }]}>Ambient</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtnSmall, { backgroundColor: colors.muted }]}
              onPress={() =>
                firstChapter &&
                router.push(
                  `/immersion-mode?bookId=${book.id}&chapterId=${currentChapter?.id ?? firstChapter.id}`
                )
              }
              activeOpacity={0.85}
            >
              <Feather name="maximize" size={14} color={colors.foreground} />
              <Text style={[styles.quickBtnTextSm, { color: colors.foreground }]}>Immersion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtnSmall, { backgroundColor: colors.muted }]}
              onPress={() => router.push("/(tabs)/characters")}
              activeOpacity={0.85}
            >
              <Feather name="users" size={14} color={colors.foreground} />
              <Text style={[styles.quickBtnTextSm, { color: colors.foreground }]}>Characters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Streak */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <StreakBadge streak={streak} />
      </View>

      {/* Meta */}
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
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{chapters.length}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Characters</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {characters.length}
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

      {/* Chapters */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chapters</Text>

        {!hasChapters ? (
          <View
            style={[
              styles.emptyChapters,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyChaptersIcon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="zap" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.emptyChaptersTitle, { color: colors.foreground }]}>
              Scenes are being prepared
            </Text>
            <Text style={[styles.emptyChaptersDesc, { color: colors.mutedForeground }]}>
              We're generating your visual companion. Set your reading position above so the first
              scenes match where you are.
            </Text>
          </View>
        ) : (
          <>
            {!savedPos && (
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                Tap "Where are you?" above to unlock chapters as you read.
              </Text>
            )}
            {visibleChapters.map((chapter) => {
              const isUnlocked = !savedPos || chapter.chapterNumber <= savedPos.chapter + 1;
              const isCurrent = savedPos?.chapter === chapter.chapterNumber;
              return (
                <TouchableOpacity
                  key={chapter.id}
                  style={[
                    styles.chapterItem,
                    {
                      backgroundColor: isCurrent ? colors.primary + "12" : colors.card,
                      borderColor: isCurrent ? colors.primary + "50" : colors.border,
                      opacity: isUnlocked ? 1 : 0.55,
                    },
                  ]}
                  onPress={() => isUnlocked && router.push(`/chapter/${chapter.id}`)}
                  activeOpacity={isUnlocked ? 0.85 : 1}
                >
                  <View
                    style={[
                      styles.chapterNum,
                      { backgroundColor: isCurrent ? colors.primary : colors.primary + "20" },
                    ]}
                  >
                    {isUnlocked ? (
                      <Text
                        style={[
                          styles.chapterNumText,
                          { color: isCurrent ? colors.primaryForeground : colors.primary },
                        ]}
                      >
                        {chapter.chapterNumber}
                      </Text>
                    ) : (
                      <Feather name="lock" size={16} color={colors.mutedForeground} />
                    )}
                  </View>
                  <View style={styles.chapterInfo}>
                    <View style={styles.chapterTitleRow}>
                      <Text style={[styles.chapterTitle, { color: colors.foreground }]}>
                        {chapter.title}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Text
                            style={[styles.currentBadgeText, { color: colors.primaryForeground }]}
                          >
                            Here
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.chapterSummary, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {isUnlocked ? chapter.summary : "Read more to unlock this chapter"}
                    </Text>
                    <Text style={[styles.sceneCount, { color: colors.accent }]}>
                      {chapter.scenes.length} scene{chapter.scenes.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  {/* Single trailing affordance — chevron when unlocked, otherwise lock icon
                      already lives in the number badge so we just show a muted spacer. */}
                  {isUnlocked && (
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              );
            })}
            {hasMoreChapters && (
              <TouchableOpacity
                style={[styles.expandBtn, { borderColor: colors.border }]}
                onPress={() => setShowAllChapters(!showAllChapters)}
                activeOpacity={0.7}
              >
                <Feather
                  name={showAllChapters ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.expandText, { color: colors.mutedForeground }]}>
                  {showAllChapters
                    ? "Show fewer"
                    : `Show all ${chapters.length} chapters`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <PositionEntry
        visible={positionVisible}
        bookId={id ?? ""}
        bookTitle={book.title}
        bookFormat={book.format}
        totalChapters={chapters.length}
        onClose={() => setPositionVisible(false)}
        onSave={handleSavePosition}
      />

      <SessionRecap
        visible={recapVisible}
        session={lastSession ?? null}
        streak={streak}
        onClose={() => setRecapVisible(false)}
      />
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
  positionWidget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  posIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  posInfo: { flex: 1, gap: 2 },
  posTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  posSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11, fontFamily: "Inter_500Medium", width: 32, textAlign: "right" },
  quickActions: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  quickBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  quickSecondary: { flexDirection: "row", gap: 8 },
  quickBtnSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  quickBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  quickBtnTextSm: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sectionHint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
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
  chapterTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chapterTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  chapterSummary: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sceneCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  expandText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
});
