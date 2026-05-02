import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import JSZip from "jszip";
import React, { useRef, useState } from "react";
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

// ─────────────────────────────────────────────
// EPUB parser (web-only, uses JSZip + DOMParser)
// ─────────────────────────────────────────────
async function parseEpub(file: File): Promise<{ title: string; text: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Try to get title from OPF metadata
  let title = file.name.replace(/\.epub$/i, "");
  const opfFile = Object.values(zip.files).find(
    (f) => f.name.endsWith(".opf") || f.name.endsWith("content.opf")
  );
  if (opfFile) {
    const opfText = await opfFile.async("string");
    const titleMatch = opfText.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) title = titleMatch[1].trim();
  }

  // Collect HTML/XHTML content files
  const htmlFiles = Object.values(zip.files).filter(
    (f) =>
      !f.dir &&
      (f.name.endsWith(".html") ||
        f.name.endsWith(".xhtml") ||
        f.name.endsWith(".htm")) &&
      !f.name.includes("toc") &&
      !f.name.includes("nav")
  );

  // Sort by name (approximates reading order)
  htmlFiles.sort((a, b) => a.name.localeCompare(b.name));

  // Extract text from first 5 chapters (to avoid overwhelming)
  const chunks: string[] = [];
  for (const hf of htmlFiles.slice(0, 5)) {
    const raw = await hf.async("string");
    // Strip tags, decode entities
    const stripped = raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, " ")
      .trim();
    if (stripped.length > 50) chunks.push(stripped);
  }

  return { title, text: chunks.join("\n\n").slice(0, 8000) };
}

export default function UploadWritingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBook, settings } = useLibrary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 24;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storyTitle, setStoryTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(settings.defaultVisualStyle);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [epubFileName, setEpubFileName] = useState<string | null>(null);
  const [epubParsing, setEpubParsing] = useState(false);

  // Web file input handler
  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".epub")) {
      setEpubParsing(true);
      setEpubFileName(file.name);
      try {
        const { title, text } = await parseEpub(file);
        if (!storyTitle) setStoryTitle(title);
        setExcerpt(text);
      } catch {
        setExcerpt("Could not parse EPUB — please paste your text manually.");
      } finally {
        setEpubParsing(false);
      }
    } else {
      // Plain text file
      const text = await file.text();
      setEpubFileName(file.name);
      setExcerpt(text.slice(0, 8000));
      if (!storyTitle) setStoryTitle(file.name.replace(/\.[^.]+$/, ""));
    }
    // Reset so same file can be re-picked
    input.value = "";
  };

  const openFilePicker = () => {
    if (Platform.OS !== "web") return;
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".epub,.txt,.md,.text";
      input.style.display = "none";
      input.addEventListener("change", handleFileChange as EventListener);
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!storyTitle.trim()) e.storyTitle = "Story title is required";
    if (!excerpt.trim()) e.excerpt = "Please paste or upload some text";
    return e;
  };

  const handleGenerate = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2200));
    await addBook({
      title: storyTitle.trim(),
      author: authorName.trim() || "You",
      format: "Own Writing",
      currentChapter: 1,
      currentPage: 1,
      currentAudioTimestamp: "",
      spoilerMode: "full-companion",
      userNote: chapterTitle ? `Chapter: ${chapterTitle}` : "",
      visualStyle,
      progress: 0,
      coverGradient: ["#1a1a4e", "#4a1a6e", "#8b5cf6"],
    });
    setGenerating(false);
    setDone(true);
  };

  if (done) {
    return (
      <View style={[styles.doneContainer, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["#1a1a4e", "#4a1a6e", "#8b5cf6"]}
          style={styles.doneGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.doneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.doneIcon, { backgroundColor: colors.primary + "25" }]}>
            <Feather name="check-circle" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>
            Your companion is ready.
          </Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
            "{storyTitle}" has been added to your library.
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
      {/* Header */}
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
            Upload an EPUB, paste text, or type your own writing to generate a visual companion.
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {/* EPUB / File upload (web only) */}
        {Platform.OS === "web" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Upload File</Text>
            <TouchableOpacity
              style={[
                styles.uploadZone,
                {
                  backgroundColor: epubFileName ? colors.accent + "12" : colors.card,
                  borderColor: epubFileName ? colors.accent : colors.border,
                },
              ]}
              onPress={openFilePicker}
              activeOpacity={0.8}
              disabled={epubParsing}
            >
              {epubParsing ? (
                <View style={styles.uploadInner}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={[styles.uploadText, { color: colors.accent }]}>
                    Parsing EPUB…
                  </Text>
                </View>
              ) : epubFileName ? (
                <View style={styles.uploadInner}>
                  <Feather name="check-circle" size={22} color={colors.accent} />
                  <View style={styles.uploadFileInfo}>
                    <Text style={[styles.uploadFileName, { color: colors.foreground }]}>
                      {epubFileName}
                    </Text>
                    <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                      Tap to replace
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadInner}>
                  <View style={[styles.uploadIconWrap, { backgroundColor: colors.accent + "20" }]}>
                    <Feather name="upload" size={22} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.uploadText, { color: colors.foreground }]}>
                      Choose an EPUB, .txt or .md file
                    </Text>
                    <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                      Text will be extracted automatically
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.supportedRow]}>
              {[".epub", ".txt", ".md"].map((ext) => (
                <View
                  key={ext}
                  style={[styles.extPill, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[styles.extText, { color: colors.mutedForeground }]}>{ext}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Divider */}
        {Platform.OS === "web" && (
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.mutedForeground }]}>or type / paste</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>
        )}

        {/* Story Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Story Title *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: errors.storyTitle ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="e.g. The Forest at Midnight"
            placeholderTextColor={colors.mutedForeground}
            value={storyTitle}
            onChangeText={setStoryTitle}
          />
          {errors.storyTitle ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{errors.storyTitle}</Text>
          ) : null}
        </View>

        {/* Author */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Author Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Your name (or leave blank)"
            placeholderTextColor={colors.mutedForeground}
            value={authorName}
            onChangeText={setAuthorName}
          />
        </View>

        {/* Chapter title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Chapter / Section Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Chapter 1 — The Beginning"
            placeholderTextColor={colors.mutedForeground}
            value={chapterTitle}
            onChangeText={setChapterTitle}
          />
        </View>

        {/* Excerpt textarea */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.foreground }]}>Your Writing *</Text>
            {excerpt.length > 0 && (
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {excerpt.length.toLocaleString()} chars
              </Text>
            )}
          </View>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: colors.card,
                borderColor: errors.excerpt ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Paste your chapter or excerpt here, or upload a file above…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            value={excerpt}
            onChangeText={setExcerpt}
          />
          {errors.excerpt ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{errors.excerpt}</Text>
          ) : null}
        </View>

        {/* Visual style */}
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
                Generating companion…
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
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
    minHeight: 180,
  },
  error: { fontSize: 12, fontFamily: "Inter_400Regular" },
  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 20,
  },
  uploadInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  uploadIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  uploadText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  uploadHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  uploadFileName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  uploadFileInfo: { gap: 2 },
  supportedRow: { flexDirection: "row", gap: 6 },
  extPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  extText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  doneGrad: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  doneCard: {
    width: "100%", borderRadius: 24, borderWidth: 1,
    padding: 32, alignItems: "center", gap: 14,
  },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  doneSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
