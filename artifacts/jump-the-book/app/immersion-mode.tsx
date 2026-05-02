import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHAPTERS, DEMO_BOOKS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function findChapter(bookId: string, chapterId: string) {
  const chapters = CHAPTERS[bookId] ?? [];
  return chapters.find((c) => c.id === chapterId) ?? null;
}

export default function ImmersionModeScreen() {
  const { bookId, chapterId, sceneIndex } = useLocalSearchParams<{
    bookId: string;
    chapterId: string;
    sceneIndex?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const chapter = findChapter(bookId ?? "", chapterId ?? "");
  const book = DEMO_BOOKS.find((b) => b.id === bookId);
  const scenes = chapter?.scenes ?? [];
  const startIndex = sceneIndex ? parseInt(sceneIndex, 10) : 0;
  const [current, setCurrent] = useState(Math.min(startIndex, scenes.length - 1));

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= scenes.length) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: next > current ? -30 : 30,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrent(next);
        slideAnim.setValue(next > current ? 30 : -30);
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    },
    [current, opacityAnim, scenes.length, slideAnim]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) animateTo(current + 1);
        else if (g.dx > 50) animateTo(current - 1);
      },
    })
  ).current;

  if (!chapter || scenes.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>No scenes found</Text>
      </View>
    );
  }

  const scene = scenes[current];
  const gradient = scene.gradientColors as [string, string, ...string[]];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <LinearGradient
        colors={gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent", "transparent", "rgba(0,0,0,0.85)"]}
          locations={[0, 0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={[styles.circleBtn, { backgroundColor: "rgba(0,0,0,0.4)" }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.progress}>
          {scenes.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => animateTo(i)}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.35)",
                    width: i === current ? 24 : 6,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.countBadge, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <Text style={styles.countText}>
            {current + 1}/{scenes.length}
          </Text>
        </View>
      </View>

      {/* Scene content */}
      <Animated.View
        style={[
          styles.sceneContent,
          { paddingBottom: bottomPad + 100, opacity: opacityAnim, transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Scene number */}
        <View style={[styles.sceneNumBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Text style={styles.sceneNumText}>Scene {current + 1}</Text>
        </View>

        {/* Title */}
        <Text style={styles.sceneTitle}>{scene.title}</Text>

        {/* Narration */}
        <View style={[styles.narrationBox, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <Text style={styles.narrationText}>"{scene.narration}"</Text>
        </View>

        {/* Summary */}
        <Text style={styles.sceneSummary}>{scene.summary}</Text>

        {/* Meta pills */}
        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="map-pin" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.metaPillText}>{scene.location}</Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="wind" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.metaPillText}>{scene.mood.split(",")[0]}</Text>
          </View>
        </View>

        {/* Characters */}
        <View style={styles.chars}>
          {scene.characters.map((c) => (
            <View key={c} style={[styles.charPill, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Text style={styles.charText}>{c}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          style={[
            styles.navBtn,
            { backgroundColor: "rgba(0,0,0,0.4)", opacity: current === 0 ? 0.3 : 1 },
          ]}
          onPress={() => animateTo(current - 1)}
          disabled={current === 0}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.sceneInfo, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          {book && (
            <Text style={styles.bookName} numberOfLines={1}>{book.title}</Text>
          )}
          <Text style={styles.chapterName} numberOfLines={1}>{chapter.title}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.navBtn,
            { backgroundColor: "rgba(0,0,0,0.4)", opacity: current === scenes.length - 1 ? 0.3 : 1 },
          ]}
          onPress={() => animateTo(current + 1)}
          disabled={current === scenes.length - 1}
        >
          <Feather name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progress: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { height: 6, borderRadius: 3 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  countText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  sceneContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 14,
  },
  sceneNumBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sceneNumText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  sceneTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 36 },
  narrationBox: { borderRadius: 14, padding: 14 },
  narrationText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 24,
    fontStyle: "italic",
  },
  sceneSummary: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 22,
  },
  metaRow: { flexDirection: "row", gap: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaPillText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  chars: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  charPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  charText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sceneInfo: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  bookName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  chapterName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
