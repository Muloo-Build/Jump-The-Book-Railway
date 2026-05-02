import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Character, CHARACTERS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

interface ContextualCharactersProps {
  bookId: string;
  activeCharacterNames: string[];
}

function RelationshipMap({ characters, colors }: { characters: Character[]; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  if (characters.length < 2) return null;
  return (
    <View style={[relStyles.container, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Text style={[relStyles.label, { color: colors.mutedForeground }]}>CONNECTIONS</Text>
      <View style={relStyles.web}>
        {characters.map((char, i) => (
          <View key={char.id} style={relStyles.node}>
            <LinearGradient
              colors={char.gradientColors as [string, string, ...string[]]}
              style={relStyles.nodeCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={relStyles.nodeInitial}>{char.name[0]}</Text>
            </LinearGradient>
            <Text style={[relStyles.nodeName, { color: colors.foreground }]} numberOfLines={1}>
              {char.name.split(" ")[0]}
            </Text>
          </View>
        ))}
      </View>
      {characters[0]?.relationshipNotes ? (
        <Text style={[relStyles.note, { color: colors.dimText }]}>{characters[0].relationshipNotes}</Text>
      ) : null}
    </View>
  );
}

export function ContextualCharacters({ bookId, activeCharacterNames }: ContextualCharactersProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState<string | null>(null);
  const allCharacters = CHARACTERS[bookId] ?? [];
  const activeChars = allCharacters.filter((c) =>
    activeCharacterNames.some((n) => c.name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(c.name.toLowerCase()))
  );

  if (activeChars.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="users" size={16} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No character data for this scene</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RelationshipMap characters={activeChars} colors={colors} />

      {activeChars.map((char) => {
        const isExpanded = expanded === char.id;
        return (
          <TouchableOpacity
            key={char.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setExpanded(isExpanded ? null : char.id)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={char.gradientColors as [string, string, ...string[]]}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitial}>{char.name[0]}</Text>
              </LinearGradient>
              <View style={styles.headerInfo}>
                <Text style={[styles.charName, { color: colors.foreground }]}>{char.name}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.rolePill, { backgroundColor: colors.accent + "20" }]}>
                    <Text style={[styles.roleText, { color: colors.accent }]}>{char.role}</Text>
                  </View>
                  <View style={[styles.statusDot, {
                    backgroundColor: char.currentStatus === "Active" ? "#4ade80" : colors.mutedForeground
                  }]} />
                </View>
              </View>
              <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </View>

            {isExpanded && (
              <View style={styles.expanded}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.description, { color: colors.foreground }]}>{char.description}</Text>
                <View style={[styles.visualBox, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.visualLabel, { color: colors.mutedForeground }]}>Visual description</Text>
                  <Text style={[styles.visualText, { color: colors.dimText }]}>{char.visualDescription}</Text>
                </View>
                {char.relationshipNotes ? (
                  <View style={[styles.relBox, { backgroundColor: colors.accent + "12" }]}>
                    <Text style={[styles.relLabel, { color: colors.accent }]}>Connections</Text>
                    <Text style={[styles.relText, { color: colors.foreground }]}>{char.relationshipNotes}</Text>
                  </View>
                ) : null}
                <Text style={[styles.firstApp, { color: colors.mutedForeground }]}>
                  First appears: {char.firstAppearance}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  emptyBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 0 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerInfo: { flex: 1, gap: 4 },
  charName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  expanded: { gap: 10, marginTop: 10 },
  divider: { height: 1 },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  visualBox: { borderRadius: 10, padding: 10, gap: 3 },
  visualLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  visualText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  relBox: { borderRadius: 10, padding: 10, gap: 3 },
  relLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  relText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  firstApp: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

const relStyles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4, gap: 10 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  web: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  node: { alignItems: "center", gap: 4 },
  nodeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nodeInitial: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  nodeName: { fontSize: 10, fontFamily: "Inter_500Medium", maxWidth: 50, textAlign: "center" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
