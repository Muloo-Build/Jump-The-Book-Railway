import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Character } from "@/data/books";
import { useColors } from "@/hooks/useColors";
import { Badge } from "./Badge";

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  const colors = useColors();
  const gradient = character.gradientColors as [string, string, ...string[]];
  const initial = character.name[0].toUpperCase();

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <LinearGradient colors={gradient} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.initial}>{initial}</Text>
        </LinearGradient>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.foreground }]}>{character.name}</Text>
          <Badge label={character.role} variant="accent" />
        </View>
        <View style={[styles.statusDot, { backgroundColor: character.currentStatus === "Active" ? "#4ade80" : colors.mutedForeground }]} />
      </View>

      <Text style={[styles.description, { color: colors.foreground }]}>{character.description}</Text>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>First appears</Text>
          <Text style={[styles.metaValue, { color: colors.foreground }]}>{character.firstAppearance}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Status</Text>
          <Text style={[styles.metaValue, { color: colors.foreground }]}>{character.currentStatus}</Text>
        </View>
      </View>

      <View style={[styles.noteBox, { backgroundColor: colors.muted }]}>
        <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>Visual description</Text>
        <Text style={[styles.noteText, { color: colors.dimText }]}>{character.visualDescription}</Text>
      </View>

      {character.relationshipNotes ? (
        <View style={[styles.noteBox, { backgroundColor: colors.accent + "15" }]}>
          <Text style={[styles.noteLabel, { color: colors.accent }]}>Connections</Text>
          <Text style={[styles.noteText, { color: colors.foreground }]}>{character.relationshipNotes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerInfo: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  divider: { height: 1 },
  metaGrid: { flexDirection: "row", gap: 16 },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  noteBox: { borderRadius: 12, padding: 12, gap: 4 },
  noteLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  noteText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
