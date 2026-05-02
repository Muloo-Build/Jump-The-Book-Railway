import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Scene } from "@/data/books";
import { useColors } from "@/hooks/useColors";

interface SceneCardProps {
  scene: Scene;
  index: number;
  onImmersion?: () => void;
  onSave?: () => void;
}

export function SceneCard({ scene, index, onImmersion, onSave }: SceneCardProps) {
  const colors = useColors();
  const gradient = scene.gradientColors as [string, string, ...string[]];

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <LinearGradient colors={gradient} style={styles.visual} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.visualOverlay} />
        <View style={styles.sceneNumBadge}>
          <Text style={styles.sceneNum}>Scene {index + 1}</Text>
        </View>
        <View style={styles.visualContent}>
          <Text style={styles.visualTitle}>{scene.title}</Text>
          <View style={styles.moodRow}>
            <Feather name="wind" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={styles.moodText}>{scene.mood}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.body, { backgroundColor: colors.card }]}>
        <Text style={[styles.summary, { color: colors.foreground }]}>{scene.summary}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{scene.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {scene.characters.join(", ")}
            </Text>
          </View>
        </View>

        <View style={[styles.narrationBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.narration, { color: colors.dimText }]}>
            "{scene.narration}"
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.border }]}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <Feather name="bookmark" size={14} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.immersionBtn, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "40" }]}
            onPress={onImmersion}
            activeOpacity={0.8}
          >
            <Feather name="maximize" size={14} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.accent }]}>Immersion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 16 },
  visual: { height: 160, justifyContent: "space-between", padding: 16 },
  visualOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
  sceneNumBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sceneNum: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold" },
  visualContent: { gap: 4 },
  visualTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  moodText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  body: { padding: 16, gap: 12 },
  summary: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  metaGrid: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  narrationBox: { borderRadius: 12, padding: 12 },
  narration: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 12, gap: 6, borderWidth: 1,
  },
  immersionBtn: {},
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
