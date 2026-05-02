import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/Badge";
import { ContextualCharacters } from "@/components/ContextualCharacters";
import { SceneCard } from "@/components/SceneCard";
import { SessionRecap } from "@/components/SessionRecap";
import { useLibrary } from "@/context/LibraryContext";
import { CHAPTERS, DEMO_BOOKS } from "@/data/books";
import { useGenerateScene, GeneratedScene } from "@/hooks/useGenerateScene";
import { useColors } from "@/hooks/useColors";

function findChapterById(chapterId: string) {
  for (const bookId of Object.keys(CHAPTERS)) {
    const chapters = CHAPTERS[bookId];
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) return { chapter, bookId };
  }
  return null;
}

type ViewMode = "scenes" | "characters" | "ambient";

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getPosition, getActiveSession, endSession, streak } = useLibrary();
  const { generate, generateImage, isLoading: aiLoading, loadingMessage } = useGenerateScene();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const [viewMode, setViewMode] = useState<ViewMode>("scenes");
  const [aiScenes, setAiScenes] = useState<GeneratedScene[] | null>(null);
  const [recapVisible, setRecapVisible] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const result = findChapterById(id ?? "");
  const book = result ? DEMO_BOOKS.find((b) => b.id === result.bookId) : null;
  const chapter = result?.chapter ?? null;
  const bookId = result?.bookId ?? "";

  const savedPos = getPosition(bookId);
  const activeSession = getActiveSession(bookId);

  // Progressive unlock
  const allScenes = chapter?.scenes ?? [];
  const unlockedScenes = savedPos
    ? allScenes.filter((_, i) => {
        const scenePct = ((i + 1) / allScenes.length) * 100;
        const chapterUnlocked =
          savedPos.chapter > (chapter?.chapterNumber ?? 1)
            ? 100
            : savedPos.chapter < (chapter?.chapterNumber ?? 1)
            ? 0
            : savedPos.percentComplete;
        return scenePct <= Math.max(chapterUnlocked, 25);
      })
    : allScenes;

  const visibleScenes = unlockedScenes.length > 0 ? unlockedScenes : allScenes.slice(0, 1);
  const allCharacters = [...new Set(visibleScenes.flatMap((s) => s.characters))];
  const allMoods = [...new Set(visibleScenes.map((s) => s.mood.split(",")[0].trim()))];

  // TEXT-ONLY generation — fast (~10-15s). Images generated per-scene via SceneCard.
  const handleGenerateAI = async () => {
    if (!book || !chapter || aiLoading) return;
    const res = await generate({
      bookTitle: book.title,
      author: book.author,
      chapterTitle: chapter.title,
      chapterNumber: chapter.chapterNumber,
      visualStyle: book.visualStyle,
      spoilerMode: "no-spoilers",
      generateImage: false, // never inline — too slow
    });
    if (res) {
      setAiScenes(res.scenes);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    await endSession(activeSession.id, chapter?.chapterNumber ?? 1, visibleScenes.length);
    setRecapVisible(true);
  };

  const sessionForRecap = activeSession
    ? {
        ...activeSession,
        endedAt: new Date().toISOString(),
        endChapter: chapter?.chapterNumber ?? 1,
        scenesUnlocked: visibleScenes.length,
        durationMinutes: Math.round(
          (Date.now() - new Date(activeSession.startedAt).getTime()) / 60000
        ),
      }
    : null;

  if (!chapter || !book) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Chapter not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={book.coverGradient as [string, string, ...string[]]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: "rgba(0,0,0,0.35)" }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerAction, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              onPress={() =>
                router.push(
                  `/ambient-companion?bookId=${bookId}&chapterId=${chapter.id}`
                )
              }
            >
              <Feather name="eye" size={14} color="#fff" />
              <Text style={styles.headerActionText}>Ambient</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerAction, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              onPress={() =>
                router.push(
                  `/immersion-mode?bookId=${bookId}&chapterId=${chapter.id}`
                )
              }
            >
              <Feather name="maximize" size={14} color="#fff" />
              <Text style={styles.headerActionText}>Immersion</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.bookLabel}>{book.title}</Text>
          <Text style={styles.chapterNum}>Chapter {chapter.chapterNumber}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        </View>
      </LinearGradient>

      {/* Active session banner */}
      {activeSession && (
        <TouchableOpacity
          style={[
            styles.sessionBanner,
            {
              backgroundColor: colors.primary + "20",
              borderColor: colors.primary + "40",
            },
          ]}
          onPress={handleEndSession}
          activeOpacity={0.8}
        >
          <View style={[styles.sessionDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sessionText, { color: colors.foreground }]}>
            Session active · tap to end &amp; see recap
          </Text>
          <Feather name="stop-circle" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Unlock banner */}
      {savedPos && (
        <View
          style={[
            styles.unlockBanner,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="unlock" size={14} color={colors.accent} />
          <Text style={[styles.unlockText, { color: colors.foreground }]}>
            {visibleScenes.length} of {allScenes.length} scenes unlocked
          </Text>
          {visibleScenes.length < allScenes.length && (
            <Text style={[styles.unlockHint, { color: colors.mutedForeground }]}>
              · read more to unlock
            </Text>
          )}
        </View>
      )}

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
          Chapter Summary
        </Text>
        <Text style={[styles.summaryText, { color: colors.foreground }]}>
          {chapter.summary}
        </Text>
      </View>

      {/* Mode tabs */}
      <View
        style={[
          styles.modeTabs,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {(["scenes", "characters", "ambient"] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeTab,
              { backgroundColor: viewMode === mode ? colors.primary : "transparent" },
            ]}
            onPress={() => setViewMode(mode)}
            activeOpacity={0.8}
          >
            <Feather
              name={mode === "scenes" ? "image" : mode === "characters" ? "users" : "eye"}
              size={14}
              color={viewMode === mode ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.modeTabText,
                {
                  color:
                    viewMode === mode ? colors.primaryForeground : colors.mutedForeground,
                },
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        <View style={styles.tagGroup}>
          <Text style={[styles.tagGroupLabel, { color: colors.mutedForeground }]}>
            Characters
          </Text>
          <View style={styles.tags}>
            {allCharacters.map((c) => (
              <Badge key={c} label={c} variant="primary" />
            ))}
          </View>
        </View>
        <View style={styles.tagGroup}>
          <Text style={[styles.tagGroupLabel, { color: colors.mutedForeground }]}>Mood</Text>
          <View style={styles.tags}>
            {allMoods.map((m) => (
              <Badge key={m} label={m} variant="accent" />
            ))}
          </View>
        </View>
      </View>

      {/* ── SCENES ─────────────────────────────────────────────────────────── */}
      {viewMode === "scenes" && (
        <View style={styles.scenesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {visibleScenes.length} Scene{visibleScenes.length !== 1 ? "s" : ""}
            </Text>
            <TouchableOpacity
              style={[
                styles.aiBtn,
                {
                  backgroundColor: aiLoading
                    ? colors.muted
                    : colors.accent + "20",
                  borderColor: colors.accent + "40",
                  opacity: aiLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleGenerateAI}
              disabled={aiLoading}
              activeOpacity={0.8}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Feather name="zap" size={14} color={colors.accent} />
              )}
              <Text style={[styles.aiBtnText, { color: colors.accent }]}>
                {aiLoading ? "Writing scenes…" : "AI Scenes"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading hint */}
          {aiLoading && (
            <View
              style={[
                styles.loadingCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator color={colors.accent} />
              <View style={styles.loadingText}>
                <Text style={[styles.loadingTitle, { color: colors.foreground }]}>
                  {loadingMessage || "Generating your scene companion…"}
                </Text>
                <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>
                  Usually 10–20 seconds. You can keep scrolling.
                </Text>
              </View>
            </View>
          )}

          {/* AI-generated scenes */}
          {aiScenes && aiScenes.length > 0 && (
            <View style={styles.aiSection}>
              <View
                style={[styles.aiBadgeRow, { backgroundColor: colors.accent + "15" }]}
              >
                <Feather name="sparkles" size={13} color={colors.accent} />
                <Text style={[styles.aiBadgeText, { color: colors.accent }]}>
                  AI-written scenes for this chapter
                </Text>
                <Text style={[styles.aiBadgeHint, { color: colors.mutedForeground }]}>
                  Tap "Generate AI image" on any card
                </Text>
              </View>
              {aiScenes.map((scene, i) => (
                <SceneCard
                  key={`ai-${i}`}
                  scene={scene as any}
                  index={i}
                  visualStyle={book.visualStyle}
                  onGenerateImage={generateImage}
                  onImmersion={() =>
                    router.push(
                      `/immersion-mode?bookId=${bookId}&chapterId=${chapter.id}&sceneIndex=${i}`
                    )
                  }
                  onSave={() => {}}
                />
              ))}
            </View>
          )}

          {/* Pre-baked scenes */}
          {visibleScenes.map((scene, i) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={i}
              visualStyle={book.visualStyle}
              onGenerateImage={generateImage}
              onImmersion={() =>
                router.push(
                  `/immersion-mode?bookId=${bookId}&chapterId=${chapter.id}&sceneIndex=${i}`
                )
              }
              onSave={() => {}}
            />
          ))}
        </View>
      )}

      {/* ── CHARACTERS ─────────────────────────────────────────────────────── */}
      {viewMode === "characters" && (
        <View style={styles.scenesSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Characters in this chapter
          </Text>
          <ContextualCharacters
            bookId={bookId}
            activeCharacterNames={allCharacters}
          />
        </View>
      )}

      {/* ── AMBIENT ────────────────────────────────────────────────────────── */}
      {viewMode === "ambient" && (
        <View style={styles.scenesSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Ambient Mode
          </Text>
          <Text style={[styles.ambientDesc, { color: colors.mutedForeground }]}>
            A full-screen cinematic layer that runs quietly beside your reading session.
            Swipe between scenes — the app dims and the gradient fills your screen.
          </Text>
          <TouchableOpacity
            style={[styles.ambientBtn, { backgroundColor: colors.accent }]}
            onPress={() =>
              router.push(
                `/ambient-companion?bookId=${bookId}&chapterId=${chapter.id}`
              )
            }
            activeOpacity={0.85}
          >
            <Feather name="eye" size={18} color="#fff" />
            <Text style={styles.ambientBtnText}>Enter Ambient Companion</Text>
          </TouchableOpacity>
          <Text style={[styles.ambientHint, { color: colors.mutedForeground }]}>
            Soundscape suggestions included. UI hides after 4 seconds.
          </Text>
        </View>
      )}

      <SessionRecap
        visible={recapVisible}
        session={sessionForRecap}
        streak={streak}
        onClose={() => setRecapVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  headerInfo: { gap: 4 },
  bookLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  chapterNum: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  chapterTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  sessionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  unlockText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  unlockHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryCard: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 24 },
  modeTabs: {
    flexDirection: "row",
    margin: 20,
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tagsRow: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  tagGroup: { gap: 6 },
  tagGroupLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scenesSection: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  loadingText: { flex: 1, gap: 4 },
  loadingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loadingHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiSection: { gap: 12 },
  aiBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  aiBadgeHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  ambientDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  ambientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  ambientBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  ambientHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
