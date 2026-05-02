import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
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

import { useLibrary } from "@/context/LibraryContext";
import { SpoilerMode, SPOILER_MODE_LABELS } from "@/data/books";
import { useGenerateScene } from "@/hooks/useGenerateScene";
import { useColors } from "@/hooks/useColors";

const FORMATS = ["EPUB / Upload", "Kindle", "Audible", "Physical Book", "PDF", "Other"];
const SPOILER_MODES: SpoilerMode[] = ["no-spoilers", "light-guidance", "full-companion"];
const GRADIENTS: string[][] = [
  ["#1a1a4e", "#4a1a6e", "#8b5cf6"],
  ["#1a0a0a", "#4a0a0a", "#8b0000"],
  ["#0a1a1a", "#1a3a3a", "#2a6a4a"],
  ["#1a1208", "#3a2808", "#7a5a18"],
  ["#0a0a1a", "#1a1a3a", "#3a3a7a"],
  ["#1a0a1a", "#3a1a3a", "#7a3a6a"],
];

interface ParsedEpub {
  title: string;
  author: string;
  chapters: { title: string; text: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-platform EPUB parser using JSZip (works in both browser and React Native)
// ─────────────────────────────────────────────────────────────────────────────
async function parseEpubFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fallbackName = "Untitled"
): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Title + author from OPF metadata
  let title = fallbackName.replace(/\.epub$/i, "");
  let author = "";
  const opfFile = Object.values(zip.files).find(
    (f) => f.name.endsWith(".opf") || f.name.endsWith("content.opf")
  );
  if (opfFile) {
    const opfText = await opfFile.async("string");
    const titleMatch = opfText.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) title = titleMatch[1].trim();
    const authorMatch = opfText.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
    if (authorMatch) author = authorMatch[1].trim();
  }

  // Collect HTML/XHTML content files (sorted = approximate reading order)
  const htmlFiles = Object.values(zip.files)
    .filter(
      (f) =>
        !f.dir &&
        (f.name.endsWith(".html") ||
          f.name.endsWith(".xhtml") ||
          f.name.endsWith(".htm")) &&
        !/toc|nav|cover|copyright|title|index/i.test(f.name)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Extract first 10 chapters of clean text
  const chapters: { title: string; text: string }[] = [];
  for (let i = 0; i < Math.min(htmlFiles.length, 10); i++) {
    const raw = await htmlFiles[i].async("string");
    const titleMatch = raw.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const chTitle = titleMatch ? titleMatch[1].trim() : `Chapter ${chapters.length + 1}`;
    const stripped = raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (stripped.length > 200) {
      chapters.push({ title: chTitle, text: stripped.slice(0, 4000) });
    }
  }

  return { title, author, chapters };
}

export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBook, updatePosition, settings } = useLibrary();
  const { generate } = useGenerateScene();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState("EPUB / Upload");
  const [chapter, setChapter] = useState("1");
  const [page, setPage] = useState("1");
  const [timestamp, setTimestamp] = useState("00:00:00");
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>(settings.spoilerMode);

  // ── EPUB state ────────────────────────────────────────────────────────────
  const [epubFileName, setEpubFileName] = useState<string | null>(null);
  const [parsedEpub, setParsedEpub] = useState<ParsedEpub | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // ── Submit state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAudio = format === "Audible";

  // ─── Web file input ─────────────────────────────────────────────────────
  const handleWebFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await processFile(file.name, await file.arrayBuffer());
    input.value = "";
  };

  const openWebPicker = () => {
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".epub";
      input.style.display = "none";
      input.addEventListener("change", handleWebFileChange as EventListener);
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  };

  // ─── Native file picker via expo-document-picker ────────────────────────
  const openNativePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/epub+zip", "application/zip", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      // Fetch the file as a blob (works in Expo on iOS / Android)
      const res = await fetch(asset.uri);
      const buf = await res.arrayBuffer();
      await processFile(asset.name ?? "book.epub", buf);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not open file");
    }
  };

  const openFilePicker = () => {
    if (Platform.OS === "web") openWebPicker();
    else openNativePicker();
  };

  // ─── Shared file processing ─────────────────────────────────────────────
  const processFile = async (name: string, buffer: ArrayBuffer) => {
    setParsing(true);
    setParseError(null);
    setEpubFileName(name);
    try {
      const parsed = await parseEpubFromArrayBuffer(buffer, name);
      if (parsed.chapters.length === 0) {
        throw new Error("No readable chapters found");
      }
      setParsedEpub(parsed);
      // Auto-fill title and author if empty
      if (!title) setTitle(parsed.title);
      if (!author && parsed.author) setAuthor(parsed.author);
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : "Could not read this EPUB. Try entering the book details below."
      );
      setParsedEpub(null);
    } finally {
      setParsing(false);
    }
  };

  const isPositiveInt = (s: string): boolean => {
    if (!s.trim()) return true; // empty → defaults to 1
    const n = Number(s);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 1;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "What's the book called?";
    if (!author.trim() && !parsedEpub) e.author = "Who wrote it?";
    if (!isPositiveInt(chapter)) e.chapter = "Use a whole number (1 or higher).";
    if (!isPositiveInt(page)) e.page = "Use a whole number (1 or higher).";
    return e;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    let addedSuccessfully = false;
    try {
      setSubmitStage("Adding to your library…");
      const grad = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
      const finalAuthor = author.trim() || parsedEpub?.author || "Unknown";

      // Defense-in-depth: validate() already blocks bad input, but clamp here
      // too so a stray NaN can never reach the position store.
      const parsedChapter = parseInt(chapter || "1", 10);
      const parsedPage = parseInt(page || "1", 10);
      const chapterNum = Number.isFinite(parsedChapter) && parsedChapter >= 1 ? parsedChapter : 1;
      const pageNum = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

      const newBookId = await addBook({
        title: title.trim(),
        author: finalAuthor,
        format,
        currentChapter: chapterNum,
        currentPage: pageNum,
        currentAudioTimestamp: timestamp,
        spoilerMode,
        userNote: "",
        visualStyle: settings.defaultVisualStyle,
        progress: 0,
        coverGradient: grad,
      });
      addedSuccessfully = true;

      // Mirror the entered position into the unified positions store so the
      // book detail screen + chapter unlock logic immediately reflect it.
      await updatePosition({
        bookId: newBookId,
        bookFormat: format,
        chapter: chapterNum,
        page: pageNum,
        timestamp,
        percentComplete: 0,
      });

      // If we parsed an EPUB, kick off scene generation for chapter 1.
      // Non-fatal — user still ends up with the book in their library if AI fails.
      if (parsedEpub && parsedEpub.chapters[0]) {
        setSubmitStage("Generating your first chapter scenes…");
        try {
          await generate({
            bookTitle: title.trim(),
            author: finalAuthor,
            chapterTitle: parsedEpub.chapters[0].title,
            chapterNumber: 1,
            visualStyle: settings.defaultVisualStyle,
            spoilerMode,
            excerpt: parsedEpub.chapters[0].text,
            generateImage: false,
          });
        } catch {
          // ignore — book is in library, generation can be retried later
        }
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace("/(tabs)/library");
    } catch (err) {
      setErrors({
        submit: addedSuccessfully
          ? "Saved your book, but something else went wrong. Try again?"
          : err instanceof Error
          ? err.message
          : "Couldn't save the book. Please try again.",
      });
    } finally {
      setSubmitting(false);
      setSubmitStage("");
    }
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
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Upload your book</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            Drop in an EPUB and we'll start generating your visual companion. No file? Just type the details below.
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {/* ── EPUB upload zone ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.uploadZone,
            {
              backgroundColor: parsedEpub
                ? colors.accent + "15"
                : parseError
                ? colors.destructive + "10"
                : colors.card,
              borderColor: parsedEpub
                ? colors.accent
                : parseError
                ? colors.destructive + "60"
                : colors.border,
            },
          ]}
          onPress={openFilePicker}
          activeOpacity={0.85}
          disabled={parsing}
        >
          {parsing ? (
            <View style={styles.uploadInner}>
              <ActivityIndicator color={colors.accent} />
              <View>
                <Text style={[styles.uploadText, { color: colors.foreground }]}>
                  Reading "{epubFileName}"…
                </Text>
                <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                  Extracting chapters
                </Text>
              </View>
            </View>
          ) : parsedEpub ? (
            <View style={styles.uploadInner}>
              <View style={[styles.uploadIconWrap, { backgroundColor: colors.accent + "30" }]}>
                <Feather name="check" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadText, { color: colors.foreground }]} numberOfLines={1}>
                  {epubFileName}
                </Text>
                <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                  {parsedEpub.chapters.length} chapter
                  {parsedEpub.chapters.length === 1 ? "" : "s"} extracted · tap to replace
                </Text>
              </View>
            </View>
          ) : parseError ? (
            <View style={styles.uploadInner}>
              <View style={[styles.uploadIconWrap, { backgroundColor: colors.destructive + "20" }]}>
                <Feather name="alert-circle" size={22} color={colors.destructive} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadText, { color: colors.foreground }]}>
                  {parseError}
                </Text>
                <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                  Tap to try a different file
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadInner}>
              <View style={[styles.uploadIconWrap, { backgroundColor: colors.accent + "20" }]}>
                <Feather name="upload-cloud" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadText, { color: colors.foreground }]}>
                  Tap to upload an EPUB
                </Text>
                <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                  We'll auto-fill the title, author, and your first scenes
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Or divider */}
        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.mutedForeground }]}>
            or enter book details
          </Text>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Book title</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: errors.title ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="e.g. The Name of the Wind"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
          />
          {errors.title && (
            <Text style={[styles.error, { color: colors.destructive }]}>{errors.title}</Text>
          )}
        </View>

        {/* Author */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Author</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: errors.author ? colors.destructive : colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="e.g. Patrick Rothfuss"
            placeholderTextColor={colors.mutedForeground}
            value={author}
            onChangeText={setAuthor}
          />
          {errors.author && (
            <Text style={[styles.error, { color: colors.destructive }]}>{errors.author}</Text>
          )}
        </View>

        {/* Format */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>How are you reading it?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formatRow}
          >
            {FORMATS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.formatPill,
                  {
                    backgroundColor: format === f ? colors.primary : colors.card,
                    borderColor: format === f ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFormat(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.formatText,
                    { color: format === f ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Position */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Where are you?</Text>
          {isAudio ? (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="HH:MM:SS"
              placeholderTextColor={colors.mutedForeground}
              value={timestamp}
              onChangeText={setTimestamp}
            />
          ) : (
            <View style={styles.inlineRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Chapter</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: errors.chapter ? colors.destructive : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  value={chapter}
                  onChangeText={setChapter}
                />
                {errors.chapter && (
                  <Text style={[styles.error, { color: colors.destructive }]}>
                    {errors.chapter}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Page</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: errors.page ? colors.destructive : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  value={page}
                  onChangeText={setPage}
                />
                {errors.page && (
                  <Text style={[styles.error, { color: colors.destructive }]}>
                    {errors.page}
                  </Text>
                )}
              </View>
            </View>
          )}
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Don't worry — you can update this any time. We'll only show scenes up to where you are.
          </Text>
        </View>

        {/* Spoiler mode */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Spoiler protection</Text>
          <View style={styles.optionGroup}>
            {SPOILER_MODES.map((mode) => {
              const active = spoilerMode === mode;
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
                  onPress={() => setSpoilerMode(mode)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: active ? colors.primary : colors.border },
                    ]}
                  >
                    {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      { color: active ? colors.primary : colors.foreground },
                    ]}
                  >
                    {SPOILER_MODE_LABELS[mode]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: submitting ? 0.75 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {submitStage || "Working…"}
              </Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Feather name="zap" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {parsedEpub ? "Add & generate scenes" : "Add to library"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {errors.submit && (
          <Text
            style={[
              styles.error,
              { color: colors.destructive, textAlign: "center", marginTop: 8 },
            ]}
          >
            {errors.submit}
          </Text>
        )}

        {/* Decorative footer */}
        <LinearGradient
          colors={["transparent", colors.accent + "08"]}
          style={styles.footerGrad}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  headerText: { flex: 1, gap: 6 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  form: { paddingHorizontal: 20, gap: 18 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  error: { fontSize: 12, fontFamily: "Inter_400Regular" },
  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 20,
  },
  uploadInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  uploadHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  orLine: { flex: 1, height: 1 },
  orText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formatRow: { gap: 8 },
  formatPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  formatText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inlineRow: { flexDirection: "row", gap: 12 },
  optionGroup: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerGrad: { height: 40, opacity: 0.3 },
});
