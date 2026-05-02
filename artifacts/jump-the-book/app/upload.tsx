import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import JSZip from "jszip";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/context/LibraryContext";
import { useGenerateScene, SceneProgress } from "@/hooks/useGenerateScene";
import { useColors } from "@/hooks/useColors";

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

type Stage = "pick" | "manual" | "ready" | "generating" | "error";
type Mode = "comic" | "cinematic";

// ─────────────────────────────────────────────────────────────────────────────
// Cross-platform EPUB parser using JSZip (works in both browser and React Native)
// ─────────────────────────────────────────────────────────────────────────────
async function parseEpubFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fallbackName = "Untitled"
): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(arrayBuffer);

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

// ───────────────────────────────────────────────────────────────────────────
// Screen
// ───────────────────────────────────────────────────────────────────────────
export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBook, updatePosition, settings } = useLibrary();
  const { generateScenesWithImages } = useGenerateScene();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 80 : insets.bottom + 24;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedEpub, setParsedEpub] = useState<ParsedEpub | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [progress, setProgress] = useState<SceneProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [whyNoKindle, setWhyNoKindle] = useState(false);
  // Optional "Pick up from chapter X" toggle (default off → start at chapter 1)
  const [chapterChoiceOpen, setChapterChoiceOpen] = useState(false);
  const [chapterChoice, setChapterChoice] = useState(1);
  // Track the book id we already created so retries don't duplicate it
  const [createdBookId, setCreatedBookId] = useState<string | null>(null);

  // ─── File pickers ────────────────────────────────────────────────────────
  const processFile = useCallback(async (name: string, buffer: ArrayBuffer) => {
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parseEpubFromArrayBuffer(buffer, name);
      if (parsed.chapters.length === 0) throw new Error("No readable chapters found");
      setParsedEpub(parsed);
      setStage("ready");
      // Fresh file → reset any prior in-flight book + chapter choice
      setCreatedBookId(null);
      setChapterChoice(1);
      setChapterChoiceOpen(false);
      setErrorMsg(null);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Could not read this EPUB."
      );
      setParsedEpub(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const openWebPicker = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".epub";
      input.style.display = "none";
      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        await processFile(file.name, await file.arrayBuffer());
        (e.target as HTMLInputElement).value = "";
      });
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  }, [processFile]);

  const openNativePicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/epub+zip", "application/zip", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const res = await fetch(asset.uri);
      const buf = await res.arrayBuffer();
      await processFile(asset.name ?? "book.epub", buf);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not open file");
    }
  }, [processFile]);

  const openFilePicker = () => {
    if (Platform.OS === "web") openWebPicker();
    else openNativePicker();
  };

  // ─── Start the visual experience ─────────────────────────────────────────
  const startExperience = useCallback(
    async (mode: Mode) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      const isManual = stage === "manual" || !parsedEpub;
      const finalTitle = isManual ? manualTitle.trim() : parsedEpub!.title;
      const finalAuthor = isManual ? manualAuthor.trim() : parsedEpub!.author || "Unknown";

      if (!finalTitle || !finalAuthor) {
        setErrorMsg("We need a title and author to get going.");
        return;
      }

      setStage("generating");
      setErrorMsg(null);
      const grad = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
      const startChapter = parsedEpub
        ? Math.min(Math.max(1, chapterChoice), parsedEpub.chapters.length)
        : 1;
      const chapterMeta = parsedEpub?.chapters[startChapter - 1];

      let bookId = createdBookId;
      if (!bookId) {
        try {
          bookId = await addBook({
            title: finalTitle,
            author: finalAuthor,
            format: "EPUB",
            currentChapter: startChapter,
            currentPage: 1,
            currentAudioTimestamp: "00:00:00",
            spoilerMode: settings.spoilerMode,
            userNote: "",
            visualStyle: settings.defaultVisualStyle,
            progress: 0,
            coverGradient: grad,
          });
          await updatePosition({
            bookId,
            bookFormat: "EPUB",
            chapter: startChapter,
            page: 1,
            timestamp: "00:00:00",
            percentComplete: 0,
          });
          setCreatedBookId(bookId);
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : "Couldn't save the book.");
          setStage("error");
          return;
        }
      }

      // Generate scenes + images for the chosen chapter, with live progress
      const result = await generateScenesWithImages(
        {
          bookTitle: finalTitle,
          author: finalAuthor,
          chapterTitle: chapterMeta?.title ?? `Chapter ${startChapter}`,
          chapterNumber: startChapter,
          visualStyle: settings.defaultVisualStyle,
          spoilerMode: settings.spoilerMode,
          excerpt: chapterMeta?.text,
        },
        (p) => setProgress(p)
      );

      if (!result) {
        setErrorMsg("Generation failed. Your book is saved — open it from your library to retry.");
        setStage("error");
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace(`/experience/${bookId}?mode=${mode}`);
    },
    [stage, parsedEpub, manualTitle, manualAuthor, chapterChoice, createdBookId, addBook, updatePosition, settings, generateScenesWithImages]
  );

  // ─────────────────────────────────────────────────────────────────────
  // GENERATING screen — full-screen progress
  // ─────────────────────────────────────────────────────────────────────
  if (stage === "generating") {
    const pct =
      progress && progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background, paddingTop: topPad + 24 }]}>
        <View style={styles.fsBody}>
          <View style={[styles.fsIcon, { backgroundColor: colors.accent + "20" }]}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
          <Text style={[styles.fsTitle, { color: colors.foreground }]}>
            {progress?.stage === "writing"
              ? "Reading your chapter…"
              : progress?.stage === "painting"
              ? "Painting your scenes…"
              : "Getting started…"}
          </Text>
          <Text style={[styles.fsSub, { color: colors.mutedForeground }]}>
            {progress?.message ?? "This usually takes about a minute."}
          </Text>
          {progress && progress.total > 0 && (
            <View style={styles.fsProgressBlock}>
              <View style={[styles.fsTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fsFill,
                    { backgroundColor: colors.accent, width: `${pct}%` as any },
                  ]}
                />
              </View>
              <Text style={[styles.fsProgressLabel, { color: colors.mutedForeground }]}>
                Scene {progress.current} of {progress.total}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN flow
  // ─────────────────────────────────────────────────────────────────────
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
            Drop in an EPUB. We'll handle the rest.
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* ─── PICK stage ──────────────────────────────────────────── */}
        {stage === "pick" && (
          <>
            <TouchableOpacity
              style={[
                styles.uploadZone,
                {
                  backgroundColor: parseError ? colors.destructive + "10" : colors.card,
                  borderColor: parseError ? colors.destructive + "60" : colors.accent + "60",
                },
              ]}
              onPress={openFilePicker}
              activeOpacity={0.85}
              disabled={parsing}
            >
              <View
                style={[
                  styles.uploadIcon,
                  { backgroundColor: parseError ? colors.destructive + "20" : colors.accent + "20" },
                ]}
              >
                {parsing ? (
                  <ActivityIndicator color={colors.accent} />
                ) : parseError ? (
                  <Feather name="alert-circle" size={28} color={colors.destructive} />
                ) : (
                  <Feather name="upload-cloud" size={28} color={colors.accent} />
                )}
              </View>
              <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
                {parsing ? "Reading your book…" : parseError ? parseError : "Tap to choose an EPUB"}
              </Text>
              <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
                {parsing
                  ? "Extracting chapters"
                  : parseError
                  ? "Tap to try a different file"
                  : "We'll auto-detect title, author, and your first chapter."}
              </Text>
            </TouchableOpacity>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={() => setStage("manual")}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  No EPUB? Enter title & author
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWhyNoKindle(true)}>
                <Text style={[styles.linkMuted, { color: colors.mutedForeground }]}>
                  Why no Kindle?
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ─── MANUAL stage ────────────────────────────────────────── */}
        {stage === "manual" && (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Book title</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="e.g. The Name of the Wind"
                placeholderTextColor={colors.mutedForeground}
                value={manualTitle}
                onChangeText={setManualTitle}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Author</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="e.g. Patrick Rothfuss"
                placeholderTextColor={colors.mutedForeground}
                value={manualAuthor}
                onChangeText={setManualAuthor}
              />
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Without an EPUB we generate scenes from the title and author alone — they'll be more
              evocative than specific.
            </Text>
            <TouchableOpacity onPress={() => setStage("pick")}>
              <Text style={[styles.link, { color: colors.primary, marginTop: 4 }]}>
                ← Back to upload
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ─── READY (parsed an EPUB) ──────────────────────────────── */}
        {stage === "ready" && parsedEpub && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.accent + "40" }]}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCheck, { backgroundColor: colors.accent + "20" }]}>
                <Feather name="check" size={20} color={colors.accent} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={[styles.summaryTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {parsedEpub.title}
                </Text>
                <Text style={[styles.summaryAuthor, { color: colors.mutedForeground }]}>
                  {parsedEpub.author || "Author unknown"} · {parsedEpub.chapters.length} chapter
                  {parsedEpub.chapters.length === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setStage("pick")}>
              <Text style={[styles.linkMuted, { color: colors.mutedForeground, textAlign: "center", marginTop: 4 }]}>
                Use a different file
              </Text>
            </TouchableOpacity>

            {/* Optional: Pick up from chapter X (off by default, only shown for multi-chapter EPUBs) */}
            {parsedEpub.chapters.length > 1 && (
              <View style={styles.chapterPickerBlock}>
                {!chapterChoiceOpen ? (
                  <TouchableOpacity
                    onPress={() => setChapterChoiceOpen(true)}
                    style={[styles.chapterToggle, { borderColor: colors.border }]}
                  >
                    <Feather name="bookmark" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.chapterToggleText, { color: colors.mutedForeground }]}>
                      {chapterChoice === 1
                        ? "Start from a different chapter?"
                        : `Starting at chapter ${chapterChoice} · change`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.chapterChipRow, { backgroundColor: colors.background }]}>
                    <Text style={[styles.chapterChipLabel, { color: colors.mutedForeground }]}>
                      Pick up at chapter
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chapterChipScroll}
                    >
                      {parsedEpub.chapters.map((_, idx) => {
                        const num = idx + 1;
                        const active = chapterChoice === num;
                        return (
                          <TouchableOpacity
                            key={num}
                            onPress={() => setChapterChoice(num)}
                            style={[
                              styles.chapterChip,
                              {
                                backgroundColor: active ? colors.accent : colors.card,
                                borderColor: active ? colors.accent : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chapterChipText,
                                { color: active ? colors.accentForeground ?? "#fff" : colors.foreground },
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ─── MODE PICKER (shown for ready or manual stages) ──────── */}
        {(stage === "ready" || stage === "manual") && (
          <View style={styles.modeBlock}>
            <Text style={[styles.modeHeading, { color: colors.foreground }]}>
              How do you want to read it?
            </Text>
            <Text style={[styles.modeSub, { color: colors.mutedForeground }]}>
              Pick one to start — you can switch any time inside.
            </Text>

            <View style={styles.modeRow}>
              <ModeTile
                icon="grid"
                title="Comic"
                desc="Vertical scroll of full-bleed AI-painted panels with the narration sitting under each one."
                colors={["#1a1a4e", "#4a1a6e"]}
                onPress={() => startExperience("comic")}
                disabled={stage === "manual" && (!manualTitle.trim() || !manualAuthor.trim())}
              />
              <ModeTile
                icon="film"
                title="Cinematic"
                desc="Full-screen scene-by-scene swipe with overlay narration — like a slow-motion movie of your book."
                colors={["#0a0a1a", "#1a1a3a"]}
                onPress={() => startExperience("cinematic")}
                disabled={stage === "manual" && (!manualTitle.trim() || !manualAuthor.trim())}
              />
            </View>
          </View>
        )}

        {/* ─── ERROR stage ─────────────────────────────────────────── */}
        {stage === "error" && (
          <View style={[styles.errorCard, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "60" }]}>
            <Feather name="alert-circle" size={20} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              {errorMsg ?? "Something went wrong."}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setStage(parsedEpub ? "ready" : "pick")}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {errorMsg && stage !== "error" && (
          <Text style={[styles.inlineError, { color: colors.destructive }]}>{errorMsg}</Text>
        )}

        <LinearGradient colors={["transparent", colors.accent + "08"]} style={styles.footerGrad} />
      </View>

      {/* ─── Why no Kindle modal ───────────────────────────────────── */}
      <Modal visible={whyNoKindle} transparent animationType="fade" onRequestClose={() => setWhyNoKindle(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setWhyNoKindle(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="info" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Kindle and Audible don't have public APIs.
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              We'd love to sync your reading position from Kindle or Audible automatically — but
              Amazon doesn't expose those libraries to third-party apps. The cleanest path that
              works today is uploading the EPUB directly. We're tracking the day this changes.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={() => setWhyNoKindle(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Mode tile
// ───────────────────────────────────────────────────────────────────────────
function ModeTile({
  icon,
  title,
  desc,
  colors,
  onPress,
  disabled,
}: {
  icon: keyof typeof import("@expo/vector-icons/Feather").default.glyphMap;
  title: string;
  desc: string;
  colors: string[];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeTile, { opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <LinearGradient colors={colors as [string, string, ...string[]]} style={styles.modeTileBg}>
        <View style={styles.modeTileIcon}>
          <Feather name={icon} size={26} color="#fff" />
        </View>
        <Text style={styles.modeTileTitle}>{title}</Text>
        <Text style={styles.modeTileDesc}>{desc}</Text>
        <View style={styles.modeTileBtn}>
          <Text style={styles.modeTileBtnText}>Start</Text>
          <Feather name="arrow-right" size={14} color="#fff" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullScreen: { flex: 1 },
  fsBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  fsIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fsTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  fsSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  fsProgressBlock: { width: "100%", marginTop: 24, gap: 8 },
  fsTrack: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  fsFill: { height: "100%", borderRadius: 3 },
  fsProgressLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
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

  body: { paddingHorizontal: 20, gap: 18 },

  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 14,
  },
  uploadIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  uploadSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  linksRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  linkMuted: { fontSize: 12, fontFamily: "Inter_500Medium" },

  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  summaryCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 10 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  summaryCheck: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 22 },
  summaryAuthor: { fontSize: 12, fontFamily: "Inter_500Medium" },

  chapterPickerBlock: { marginTop: 8 },
  chapterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "center",
  },
  chapterToggleText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chapterChipRow: {
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  chapterChipLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  chapterChipScroll: { gap: 6, paddingVertical: 4 },
  chapterChip: {
    minWidth: 36,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  chapterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  modeBlock: { gap: 10, marginTop: 4 },
  modeHeading: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modeSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modeRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  modeTile: { flex: 1, borderRadius: 18, overflow: "hidden" },
  modeTileBg: { padding: 16, gap: 8, minHeight: 200 },
  modeTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modeTileTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  modeTileDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
    flex: 1,
  },
  modeTileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
  },
  modeTileBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  errorCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10, alignItems: "center" },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 20 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  inlineError: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  footerGrad: { height: 40, opacity: 0.3 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 12, maxWidth: 420, width: "100%" },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
