import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { RemoteScene } from "@workspace/jump-the-book-shared";

import type { UserLibraryItem } from "@/data/books";
import { useColors } from "@/hooks/useColors";

interface Props {
  book: UserLibraryItem;
  /** Most recent scene for this book, if any. Powers the hero image,
   * chapter label, and italic narration quote. */
  latestScene?: RemoteScene | null;
}

/**
 * Mobile mirror of `<NowReadingHero>` from the web.
 *
 * "Continue reading" stage pinned to the top of the library tab. Uses
 * the latest scene image when available, falling back to the book's
 * stored hero (URL or bundled asset slug), then to the cover gradient.
 * Tapping Resume jumps into the comic experience at the saved chapter.
 */
export default function NowReadingHero({ book, latestScene }: Props) {
  const colors = useColors();

  const progress = Math.max(0, Math.min(100, book.progress ?? 0));
  const chapter = latestScene?.chapterNumber ?? book.currentChapter ?? 1;
  const sceneIndex = latestScene?.sceneIndex;

  // The italic quote prefers narration, then a soft default so the
  // hero never looks empty. (User-added books on mobile don't carry a
  // tagline field — that one's web/demo-only.)
  const quote =
    (latestScene?.narration ?? "").trim() ||
    "The next scene is queued and waiting.";

  // Hero image: latest scene image, otherwise just the cover gradient.
  // User books on mobile don't carry a bundled hero asset slug.
  const remoteHero = latestScene?.imageUrl ? { uri: latestScene.imageUrl } : null;

  const gradient =
    book.coverGradient && book.coverGradient.length >= 2
      ? (book.coverGradient as [string, string, ...string[]])
      : (["#1a1525", "#453560"] as [string, string]);

  const onResume = () => router.push(`/experience/${book.id}?mode=comic`);
  const onAllScenes = () => router.push(`/book/${book.id}`);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.stage}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
        {remoteHero && (
          <Image source={remoteHero} style={styles.stageImg} resizeMode="cover" />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.stageTop}>
          <Text style={styles.stageEyebrow}>
            CHAPTER {chapter}
            {sceneIndex !== undefined && sceneIndex !== null
              ? ` · SCENE ${sceneIndex}`
              : ""}
          </Text>
          <View style={styles.continuePill}>
            <Text style={styles.continuePillText}>CONTINUE READING</Text>
          </View>
        </View>

        {latestScene?.title && (
          <Text style={styles.stageCaption} numberOfLines={2}>
            {latestScene.title}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.bookAuthor, { color: colors.mutedForeground }]} numberOfLines={1}>
          {book.author}
          {progress > 0 ? `  ·  ${progress}%` : ""}
        </Text>

        <View style={[styles.quoteWrap, { borderLeftColor: colors.accent + "60" }]}>
          <Text style={[styles.quote, { color: colors.foreground }]} numberOfLines={4}>
            “{quote}”
          </Text>
        </View>

        {progress > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent, width: `${progress}%` },
              ]}
            />
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={onResume}
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
          >
            <Feather name="play" size={14} color="#08081a" />
            <Text style={[styles.primaryBtnText, { color: "#08081a" }]}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAllScenes}
            style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            activeOpacity={0.85}
          >
            <Feather name="layers" size={14} color={colors.foreground} />
            <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>
              All scenes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  stage: {
    height: 180,
    overflow: "hidden",
    position: "relative",
  },
  stageImg: { width: "100%", height: "100%" },
  stageTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stageEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
  },
  continuePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(252,211,77,0.2)",
    borderWidth: 1,
    borderColor: "rgba(252,211,77,0.55)",
  },
  continuePillText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fcd34d",
    letterSpacing: 1.3,
  },
  stageCaption: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    fontSize: 12,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.85)",
  },
  body: { padding: 16, gap: 10 },
  bookTitle: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  bookAuthor: { fontSize: 12, fontFamily: "Inter_500Medium" },
  quoteWrap: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    paddingVertical: 2,
    marginTop: 4,
  },
  quote: { fontSize: 14, fontStyle: "italic", lineHeight: 21 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
