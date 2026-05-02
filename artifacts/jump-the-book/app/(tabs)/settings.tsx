import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StyleSelector } from "@/components/StyleSelector";
import { useLibrary } from "@/context/LibraryContext";
import { SpoilerMode, SPOILER_MODE_LABELS, VisualStyle } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const READING_MODES: { id: "reading" | "listening" | "both"; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "reading", label: "Reading", icon: "book" },
  { id: "listening", label: "Listening", icon: "headphones" },
  { id: "both", label: "Both", icon: "layers" },
];

const SPOILER_MODES: SpoilerMode[] = ["no-spoilers", "light-guidance", "full-companion"];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      {/* Account entry — sign-in/out + orphan recovery live there. */}
      <TouchableOpacity
        onPress={() => router.push("/account")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginHorizontal: 20,
          marginTop: 8,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
        activeOpacity={0.85}
      >
        <Feather name="user" size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground }}>
            Account
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Inter_500Medium",
              color: colors.mutedForeground,
              marginTop: 2,
            }}
          >
            Sign in/out and recover orphan scenes.
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Visual Style */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Default Visual Style</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          This style will be applied to new companions you generate.
        </Text>
        <StyleSelector
          value={settings.defaultVisualStyle}
          onChange={(style: VisualStyle) => updateSettings({ defaultVisualStyle: style })}
        />
      </View>

      {/* Spoiler Mode */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Spoiler Preference</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          No spoilers keeps the companion limited to where you are in the story.
        </Text>
        <View style={styles.optionGroup}>
          {SPOILER_MODES.map((mode) => {
            const active = settings.spoilerMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: active ? colors.primary + "15" : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => updateSettings({ spoilerMode: mode })}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.optionText, { color: active ? colors.primary : colors.foreground }]}>
                  {SPOILER_MODE_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Reading Mode */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reading Mode</Text>
        <View style={styles.readingRow}>
          {READING_MODES.map((m) => {
            const active = settings.readingMode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.readingBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => updateSettings({ readingMode: m.id })}
                activeOpacity={0.8}
              >
                <Feather name={m.icon} size={16} color={active ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.readingLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Coming Soon */}
      <View style={styles.section}>
        <View style={[styles.comingHeader, { borderColor: colors.accent + "40" }]}>
          <Feather name="zap" size={14} color={colors.accent} />
          <Text style={[styles.comingTitle, { color: colors.accent }]}>Coming Soon</Text>
        </View>
        {[
          { label: "Voice Narration", icon: "mic" },
          { label: "Book Club Mode", icon: "users" },
          { label: "Export as Storyboard", icon: "download" },
          { label: "Interactive Character Maps", icon: "users" },
        ].map((item) => (
          <View
            key={item.label}
            style={[styles.comingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name={item.icon as any} size={18} color={colors.mutedForeground} />
            <Text style={[styles.comingLabel, { color: colors.foreground }]}>{item.label}</Text>
            <View style={styles.spacer} />
            <Switch
              value={false}
              disabled
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.mutedForeground}
            />
          </View>
        ))}
      </View>

      <View style={[styles.versionBox, { marginHorizontal: 20, marginTop: 8 }]}>
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          Jump the Book — MVP v0.1
        </Text>
        <Text style={[styles.versionSub, { color: colors.mutedForeground + "80" }]}>
          Step inside the story.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 8 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  section: { paddingHorizontal: 20, paddingTop: 28, gap: 14 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  optionGroup: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  readingRow: { flexDirection: "row", gap: 10 },
  readingBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  readingLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  comingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  comingTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  comingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  comingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  spacer: { flex: 1 },
  versionBox: { alignItems: "center", paddingVertical: 24, gap: 4 },
  versionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  versionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
