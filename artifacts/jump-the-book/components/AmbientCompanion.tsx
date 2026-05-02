import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chapter, Scene } from "@/data/books";
import { useColors } from "@/hooks/useColors";
import { GeneratedScene } from "@/hooks/useGenerateScene";

type AnyScene = Scene | GeneratedScene;

interface AmbientCompanionProps {
  scenes: AnyScene[];
  chapterTitle: string;
  bookTitle: string;
  bookId: string;
  chapterId: string;
  initialSceneIndex?: number;
  onExit?: () => void;
}

const { width: W, height: H } = Dimensions.get("window");

const MOOD_SOUNDSCAPES: Record<string, string> = {
  curious: "🌿 Forest ambience",
  mysterious: "🕯️ Candlelight flicker",
  dark: "⛈️ Storm at distance",
  romantic: "🌧️ Soft rain",
  tense: "💨 Wind through ruins",
  magical: "✨ Ethereal shimmer",
  melancholy: "🌊 Slow tide",
  adventurous: "🏔️ Mountain wind",
  peaceful: "🍃 Gentle breeze",
  horror: "🌑 Dead silence",
};

function getSoundscape(mood: string): string {
  const lower = mood.toLowerCase();
  for (const [key, val] of Object.entries(MOOD_SOUNDSCAPES)) {
    if (lower.includes(key)) return val;
  }
  return "🌌 Ambient atmosphere";
}

export function AmbientCompanion({
  scenes,
  chapterTitle,
  bookTitle,
  bookId,
  chapterId,
  initialSceneIndex = 0,
  onExit,
}: AmbientCompanionProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(Math.min(initialSceneIndex, scenes.length - 1));
  const [uiVisible, setUiVisible] = useState(true);

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Slow ambient pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 4000, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 4000, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Auto-hide UI after 4s
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacityAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start(() =>
        setUiVisible(false)
      );
    }, 4000);
    return () => clearTimeout(t);
  }, [current, opacityAnim]);

  const showUI = () => {
    setUiVisible(true);
    Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    const t = setTimeout(() => {
      Animated.timing(opacityAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start(() =>
        setUiVisible(false)
      );
    }, 4000);
    return () => clearTimeout(t);
  };

  const animateTo = (next: number) => {
    if (next < 0 || next >= scenes.length) return;
    const dir = next > current ? -40 : 40;
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: dir, duration: 200, useNativeDriver: false }),
    ]).start(() => {
      setCurrent(next);
      slideAnim.setValue(-dir);
      setUiVisible(true);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) animateTo(current + 1);
        else if (g.dx > 60) animateTo(current - 1);
        else showUI();
      },
    })
  ).current;

  const scene = scenes[current];
  const gradient = (scene as Scene).gradientColors
    ? (scene as Scene).gradientColors as [string, string, ...string[]]
    : ["#1a1a4e", "#4a1a6e", "#8b5cf6"] as [string, string, string];
  const mood = scene.mood;
  const soundscape = getSoundscape(mood);

  return (
    <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
      {/* Animated background */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Dark vignette */}
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "transparent", "transparent", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.25, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Progress dots */}
      <View style={[styles.dots, { paddingTop: insets.top + 16 }]}>
        {scenes.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => animateTo(i)}>
            <View style={[styles.dot, { backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.3)", width: i === current ? 20 : 6 }]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Main scene content */}
      <Animated.View style={[styles.content, { paddingBottom: insets.bottom + 120, opacity: opacityAnim, transform: [{ translateX: slideAnim }] }]}>
        <View style={[styles.sceneNumBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Text style={styles.sceneNum}>Scene {current + 1} of {scenes.length}</Text>
        </View>

        <Text style={styles.sceneTitle}>{scene.title}</Text>

        <View style={[styles.narrationBox, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <Text style={styles.narration}>
            {(scene as Scene).narration || (scene as GeneratedScene).narration}
          </Text>
        </View>

        <Text style={styles.summary}>{scene.summary}</Text>

        {/* Soundscape suggestion */}
        <View style={[styles.soundscapeRow, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
          <Text style={styles.soundscapeText}>{soundscape}</Text>
          <Text style={styles.soundscapeHint}> · Suggested atmosphere</Text>
        </View>

        {/* Mood + location pills */}
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="wind" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.pillText}>{mood.split(",")[0].trim()}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="map-pin" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.pillText}>{scene.location}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: "rgba(0,0,0,0.45)", opacity: current === 0 ? 0.3 : 1 }]}
          onPress={() => animateTo(current - 1)}
          disabled={current === 0}
        >
          <Feather name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.centerControls}>
          <TouchableOpacity
            style={[styles.exitBtn, { backgroundColor: "rgba(0,0,0,0.45)" }]}
            onPress={onExit ?? router.back}
          >
            <Feather name="minimize-2" size={14} color="#fff" />
            <Text style={styles.exitText}>Exit Ambient</Text>
          </TouchableOpacity>
          <Text style={styles.swipeHint}>Swipe or tap arrows to move scenes</Text>
        </View>

        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: "rgba(0,0,0,0.45)", opacity: current === scenes.length - 1 ? 0.3 : 1 }]}
          onPress={() => animateTo(current + 1)}
          disabled={current === scenes.length - 1}
        >
          <Feather name="chevron-right" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5, zIndex: 10 },
  dot: { height: 6, borderRadius: 3 },
  content: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, gap: 12 },
  sceneNumBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sceneNum: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  sceneTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 38 },
  narrationBox: { borderRadius: 14, padding: 14 },
  narration: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.9)", lineHeight: 24, fontStyle: "italic" },
  summary: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", lineHeight: 20 },
  soundscapeRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  soundscapeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.9)" },
  soundscapeHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  pills: { flexDirection: "row", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pillText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  controls: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12 },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  centerControls: { flex: 1, alignItems: "center", gap: 8 },
  exitBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  exitText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#fff" },
  swipeHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
});
