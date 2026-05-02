import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { StreakData } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";

interface StreakBadgeProps {
  streak: StreakData;
  compact?: boolean;
}

export function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  const colors = useColors();
  const has = streak.currentStreak > 0;

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: has ? colors.gold + "20" : colors.muted, borderColor: has ? colors.gold + "40" : colors.border }]}>
        <Text style={styles.fire}>{has ? "🔥" : "📚"}</Text>
        <Text style={[styles.compactNum, { color: has ? colors.gold : colors.mutedForeground }]}>
          {has ? `${streak.currentStreak}d` : "Start"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: has ? colors.gold + "12" : colors.card, borderColor: has ? colors.gold + "30" : colors.border }]}>
      <Text style={styles.bigFire}>{has ? "🔥" : "📚"}</Text>
      <View style={styles.info}>
        <Text style={[styles.streakNum, { color: has ? colors.gold : colors.foreground }]}>
          {has ? `${streak.currentStreak} day streak` : "No streak yet"}
        </Text>
        <Text style={[styles.streakSub, { color: colors.mutedForeground }]}>
          {has
            ? `Longest: ${streak.longestStreak} days · ${streak.totalSessionsCount} total sessions`
            : "Read today to start your streak"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  bigFire: { fontSize: 28 },
  info: { flex: 1, gap: 2 },
  streakNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  streakSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  compact: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  fire: { fontSize: 14 },
  compactNum: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
