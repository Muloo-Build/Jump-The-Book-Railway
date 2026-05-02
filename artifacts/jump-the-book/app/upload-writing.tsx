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
import { VisualStyle } from "@/data/books";
import { useColors } from "@/hooks/useColors";

export default function UploadWritingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBook, settings } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const [storyTitle, setStoryTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(settings.defaultVisualStyle);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!storyTitle.trim()) e.storyTitle = "Story title is required";
    if (!excerpt.trim()) e.excerpt = "Please paste some text to generate scenes";
    return e;
  };

  const handleGenerate = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((r) => setTimeout(r, 2800));
    await addBook({
      title: storyTitle.trim(),
      author: authorName.trim() || "You",
      format: "Own Writing",
      currentChapter: 1,
      currentPage: 1,
      currentAudioTimestamp: "",
      spoilerMode: "full-companion",
      userNote: `Chapter: ${chapterTitle || "Chapter 1"}`,
      visualStyle,
      progress: 0,
      coverGradient: ["#1a1a4e", "#4a1a6e", "#8b5cf6"],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGenerating(false);
    setDone(true);
  };

  if (done) {
    return (
      <View style={[styles.doneContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.doneIcon, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="check-circle" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>
          Your story companion is ready.
        </Text>
        <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
          Your writing has been added to your library with a visual companion.
        </Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(tabs)/library")}
          activeOpacity={0.85}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>
            View in Library
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Upload Writing</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            Paste your own writing and turn it into an immersive visual companion. Perfect for authors, creators and storytellers.
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Story Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: errors.storyTitle ? colors.destructive : colors.border, color: colors.foreground }]}
            placeholder="e.g. The Forest at Midnight"
            placeholderTextColor={colors.mutedForeground}
            value={storyTitle}
            onChangeText={setStoryTitle}
          />
          {errors.storyTitle && <Text style={[styles.error, { color: colors.destructive }]}>{errors.storyTitle}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Author Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            value={authorName}
            onChangeText={setAuthorName}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Chapter Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Chapter 1 — The Beginning"
            placeholderTextColor={colors.mutedForeground}
            value={chapterTitle}
            onChangeText={setChapterTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Your Writing *</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: errors.excerpt ? colors.destructive : colors.border, color: colors.foreground }]}
            placeholder="Paste your chapter or excerpt here..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            value={excerpt}
            onChangeText={setExcerpt}
          />
          {errors.excerpt && <Text style={[styles.error, { color: colors.destructive }]}>{errors.excerpt}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Visual Style</Text>
          <StyleSelector value={visualStyle} onChange={setVisualStyle} />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: generating ? 0.75 : 1 }]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                Generating companion...
              </Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Feather name="zap" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                Generate Companion
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
  form: { paddingHorizontal: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 160 },
  error: { fontSize: 12, fontFamily: "Inter_400Regular" },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  doneSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
