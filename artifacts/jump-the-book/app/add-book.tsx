import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StyleSelector } from "@/components/StyleSelector";
import { useLibrary } from "@/context/LibraryContext";
import { SpoilerMode, SPOILER_MODE_LABELS, VisualStyle } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const FORMATS = ["Kindle", "Audible", "Physical Book", "PDF", "EPUB", "Other"];
const SPOILER_MODES: SpoilerMode[] = ["no-spoilers", "light-guidance", "full-companion"];
const GRADIENTS: string[][] = [
  ["#1a1a4e", "#4a1a6e", "#8b5cf6"],
  ["#1a0a0a", "#4a0a0a", "#8b0000"],
  ["#0a1a1a", "#1a3a3a", "#2a6a4a"],
  ["#1a1208", "#3a2808", "#7a5a18"],
  ["#0a0a1a", "#1a1a3a", "#3a3a7a"],
  ["#1a0a1a", "#3a1a3a", "#7a3a6a"],
];

export default function AddBookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBook, settings } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState("Physical Book");
  const [currentChapter, setCurrentChapter] = useState("");
  const [currentPage, setCurrentPage] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>(settings.spoilerMode);
  const [userNote, setUserNote] = useState("");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(settings.defaultVisualStyle);
  const [excerpt, setExcerpt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isKindleOrAudible = format === "Kindle" || format === "Audible";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Book title is required";
    if (!author.trim()) e.author = "Author name is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((r) => setTimeout(r, 2200));
    const grad = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    await addBook({
      title: title.trim(),
      author: author.trim(),
      format,
      currentChapter: parseInt(currentChapter || "1", 10),
      currentPage: parseInt(currentPage || "1", 10),
      currentAudioTimestamp: timestamp,
      spoilerMode,
      userNote: userNote.trim(),
      visualStyle,
      progress: 0,
      coverGradient: grad,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGenerating(false);
    router.replace("/(tabs)/library");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Add Current Read</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            Jump the Book will create a spoiler-safe visual companion.
          </Text>
        </View>
      </View>

      {isKindleOrAudible && (
        <View style={[styles.noticeBox, { backgroundColor: colors.gold + "15", borderColor: colors.gold + "40" }]}>
          <Feather name="info" size={16} color={colors.gold} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>
            Direct {format} syncing is planned, but for the MVP you can manually add your current chapter, page or timestamp.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Book Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: errors.title ? colors.destructive : colors.border, color: colors.foreground }]}
            placeholder="e.g. The Name of the Wind"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
          />
          {errors.title && <Text style={[styles.error, { color: colors.destructive }]}>{errors.title}</Text>}
        </View>

        {/* Author */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Author *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: errors.author ? colors.destructive : colors.border, color: colors.foreground }]}
            placeholder="e.g. Patrick Rothfuss"
            placeholderTextColor={colors.mutedForeground}
            value={author}
            onChangeText={setAuthor}
          />
          {errors.author && <Text style={[styles.error, { color: colors.destructive }]}>{errors.author}</Text>}
        </View>

        {/* Format */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Format</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formatRow}>
            {FORMATS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.formatPill,
                  { backgroundColor: format === f ? colors.primary : colors.card, borderColor: format === f ? colors.primary : colors.border },
                ]}
                onPress={() => setFormat(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.formatText, { color: format === f ? colors.primaryForeground : colors.foreground }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chapter / Page / Timestamp */}
        <View style={styles.inlineRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Chapter</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="1"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={currentChapter}
              onChangeText={setCurrentChapter}
            />
          </View>
          {format !== "Audible" ? (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Page</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="1"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                value={currentPage}
                onChangeText={setCurrentPage}
              />
            </View>
          ) : (
            <View style={[styles.field, { flex: 1.5 }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Timestamp</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="1:23:45"
                placeholderTextColor={colors.mutedForeground}
                value={timestamp}
                onChangeText={setTimestamp}
              />
            </View>
          )}
        </View>

        {/* Spoiler mode */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Spoiler Mode</Text>
          <View style={styles.optionGroup}>
            {SPOILER_MODES.map((mode) => {
              const active = spoilerMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.optionRow, { backgroundColor: active ? colors.primary + "15" : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setSpoilerMode(mode)}
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

        {/* Visual style */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Visual Style</Text>
          <StyleSelector value={visualStyle} onChange={setVisualStyle} />
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Your Notes (optional)</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="What's happening in the story so far?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={userNote}
            onChangeText={setUserNote}
          />
        </View>

        {/* Excerpt */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Paste Excerpt (optional)</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, minHeight: 100 }]}
            placeholder="Paste a passage to help generate more accurate scenes..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            value={excerpt}
            onChangeText={setExcerpt}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: generating ? 0.75 : 1 }]}
          onPress={handleSubmit}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                Generating companion...
              </Text>
            </View>
          ) : (
            <View style={styles.generatingRow}>
              <Feather name="zap" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                Create Visual Companion
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, marginTop: 4 },
  headerText: { flex: 1, gap: 4 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  noticeBox: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  form: { paddingHorizontal: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80 },
  error: { fontSize: 12, fontFamily: "Inter_400Regular" },
  formatRow: { gap: 8 },
  formatPill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  formatText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inlineRow: { flexDirection: "row", gap: 12 },
  optionGroup: { gap: 8 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  generatingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
