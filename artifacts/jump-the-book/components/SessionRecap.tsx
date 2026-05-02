import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ReadingSession, StreakData } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";

interface SessionRecapProps {
  visible: boolean;
  session: ReadingSession | null;
  streak: StreakData;
  onClose: () => void;
}

export function SessionRecap({ visible, session, streak, onClose }: SessionRecapProps) {
  const colors = useColors();
  if (!session) return null;

  const chapsCovered =
    session.endChapter && session.endChapter > session.startChapter
      ? session.endChapter - session.startChapter + 1
      : 1;

  const streakMsg =
    streak.currentStreak >= 7
      ? "🔥 You're on fire — " + streak.currentStreak + " days straight!"
      : streak.currentStreak >= 3
      ? "⚡ " + streak.currentStreak + " day reading streak!"
      : streak.currentStreak === 1
      ? "✨ Great — you started your streak!"
      : "📚 Keep going to build your streak";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={["#1a1a4e", "#4a1a6e"]}
            style={styles.cardHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerEmoji}>📖</Text>
            <Text style={styles.headerTitle}>Session Complete</Text>
            <Text style={styles.headerBook} numberOfLines={1}>{session.bookTitle}</Text>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.statsRow}>
              <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{chapsCovered}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {chapsCovered === 1 ? "Chapter" : "Chapters"}
                </Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{session.scenesUnlocked}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Scenes</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.muted }]}>
                <Text style={[styles.statValue, { color: colors.gold }]}>
                  {session.durationMinutes ?? "—"}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Minutes</Text>
              </View>
            </View>

            <View style={[styles.streakBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <Text style={[styles.streakText, { color: colors.foreground }]}>{streakMsg}</Text>
              <View style={styles.streakRow}>
                {Array.from({ length: Math.min(streak.currentStreak, 7) }).map((_, i) => (
                  <View key={i} style={[styles.streakDot, { backgroundColor: colors.primary }]} />
                ))}
                {Array.from({ length: Math.max(0, 7 - streak.currentStreak) }).map((_, i) => (
                  <View key={i + 100} style={[styles.streakDot, { backgroundColor: colors.border }]} />
                ))}
              </View>
            </View>

            <Text style={[styles.encouragement, { color: colors.mutedForeground }]}>
              {streak.currentStreak > 0
                ? "Come back tomorrow to keep your streak alive."
                : "Reading every day builds a habit. See you tomorrow."}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.closeBtnText, { color: colors.primaryForeground }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  cardHeader: { padding: 24, alignItems: "center", gap: 4 },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  headerBook: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  body: { padding: 20, gap: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  streakBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  streakText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  streakRow: { flexDirection: "row", gap: 6 },
  streakDot: { width: 20, height: 20, borderRadius: 10 },
  encouragement: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center" },
  closeBtn: { margin: 20, marginTop: 0, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  closeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
