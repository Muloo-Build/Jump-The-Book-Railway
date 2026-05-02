import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { RemoteScene } from "@workspace/jump-the-book-shared";

import { useColors } from "@/hooks/useColors";
import { useRemoteSceneLibrary } from "@/hooks/useRemoteLibrary";

interface BookRef {
  id: string;
  title: string;
}

interface Props {
  /** Maps userBookId → display info so we can show "from <book>" labels.
   *  Pass user library books here; demo books work too as long as the
   *  scene's userBookId points back to one. */
  books: BookRef[];
}

const RECENT_LIMIT = 6;

/**
 * Mobile take on the web's `<SceneLibrary>` rail.
 *
 * Renders a horizontal "recently generated" rail at the top, then a
 * compact per-book grid summary. Orphan recovery and search live on the
 * web for now — mobile prioritizes the at-a-glance rail. Tapping a tile
 * jumps into that book's experience scoped to the right chapter.
 */
export default function ScenesSection({ books }: Props) {
  const colors = useColors();
  const sceneQ = useRemoteSceneLibrary();
  const scenes: RemoteScene[] = sceneQ.data ?? [];

  const bookById = useMemo(() => {
    const m = new Map<string, BookRef>();
    for (const b of books) m.set(b.id, b);
    return m;
  }, [books]);

  const recent = useMemo(
    () =>
      [...scenes]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_LIMIT),
    [scenes],
  );

  const perBookCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scenes) m.set(s.userBookId, (m.get(s.userBookId) ?? 0) + 1);
    return [...m.entries()]
      .map(([id, n]) => ({ id, n, ref: bookById.get(id) }))
      .filter((x) => x.ref) // hide orphans here; recovery surface is on web
      .sort((a, b) => b.n - a.n);
  }, [scenes, bookById]);

  if (sceneQ.isLoading) {
    // No spinner — keep the library tab quiet; the rail just appears
    // when data lands.
    return null;
  }

  if (scenes.length === 0) return null;

  const openScene = (s: RemoteScene) => {
    router.push(
      `/experience/${encodeURIComponent(s.userBookId)}?mode=comic&chapter=${s.chapterNumber}`,
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Your scenes
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {scenes.length} saved · {perBookCounts.length}{" "}
          {perBookCounts.length === 1 ? "book" : "books"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {recent.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => openScene(s)}
            activeOpacity={0.85}
            style={[
              styles.tile,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.tileImgWrap}>
              {s.imageUrl ? (
                <Image
                  source={{ uri: s.imageUrl }}
                  style={styles.tileImg}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.tileImg,
                    { backgroundColor: s.gradientColors?.[0] ?? "#1a1525" },
                  ]}
                />
              )}
              <View style={styles.tileOverlay} />
              <Text style={styles.tileChapterPill}>CH {s.chapterNumber}</Text>
            </View>
            <View style={styles.tileBody}>
              <Text
                numberOfLines={2}
                style={[styles.tileTitle, { color: colors.foreground }]}
              >
                {s.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.tileMeta, { color: colors.mutedForeground }]}
              >
                {bookById.get(s.userBookId)?.title ?? "Unknown book"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {perBookCounts.length > 1 && (
        <View style={styles.bookCountRow}>
          {perBookCounts.slice(0, 6).map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => router.push(`/book/${b.id}`)}
              activeOpacity={0.8}
              style={[
                styles.countChip,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.countN, { color: colors.foreground }]}>
                {b.n}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.countLabel, { color: colors.mutedForeground }]}
              >
                {b.ref!.title}
              </Text>
              <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingHorizontal: 20 },
  header: { gap: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  rail: { gap: 10, paddingRight: 20 },
  tile: {
    width: 180,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tileImgWrap: { width: "100%", aspectRatio: 16 / 10, position: "relative" },
  tileImg: { width: "100%", height: "100%" },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  tileChapterPill: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    letterSpacing: 0.8,
    overflow: "hidden",
  },
  tileBody: { padding: 10, gap: 4 },
  tileTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  tileMeta: { fontSize: 10, fontFamily: "Inter_500Medium" },
  bookCountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: "100%",
  },
  countN: { fontSize: 13, fontFamily: "Inter_700Bold" },
  countLabel: { fontSize: 11, fontFamily: "Inter_500Medium", maxWidth: 110 },
});
