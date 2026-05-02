import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import {
  searchOpenLibrary,
  type OpenLibrarySearchResult,
} from "@workspace/jump-the-book-shared";

import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  guessedTitle: string;
  guessedAuthor: string;
  /** 0..1 self-reported vision-model confidence. */
  confidence: number;
  onClose: () => void;
}

const RESULT_LIMIT = 3;
const FALLBACK_GRADIENT: string[] = ["#3a1a6e", "#9d7fe8"];

/**
 * Mobile equivalent of the web's `<CoverPickerDialog>`.
 *
 * After a cover snap, we ask Open Library for the top matches of the
 * model-read (title, author) and let the user pick which edition to add
 * to their library. The first match is preselected; an "Edit search"
 * affordance lets the user override the title/author and re-query.
 */
export default function CoverPickerModal({
  visible,
  guessedTitle,
  guessedAuthor,
  confidence,
  onClose,
}: Props) {
  const colors = useColors();
  const { addBook, settings } = useLibrary();

  const [editing, setEditing] = useState(false);
  const [titleQ, setTitleQ] = useState(guessedTitle);
  const [authorQ, setAuthorQ] = useState(guessedAuthor);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reseed the local state whenever a *new* snap opens this modal. We
  // depend only on the guessed strings so user edits aren't wiped.
  useEffect(() => {
    setTitleQ(guessedTitle);
    setAuthorQ(guessedAuthor);
    setSelectedKey(null);
    setEditing(false);
    setErrorMsg(null);
  }, [guessedTitle, guessedAuthor]);

  const queryStr = `${titleQ.trim()} ${authorQ.trim()}`.trim();
  const search = useQuery({
    queryKey: ["openlib", "cover-picker", titleQ.trim(), authorQ.trim()],
    enabled: visible && queryStr.length >= 3,
    queryFn: ({ signal }) => searchOpenLibrary(queryStr, signal),
    staleTime: 60_000,
  });

  const candidates: OpenLibrarySearchResult[] = (search.data ?? []).slice(
    0,
    RESULT_LIMIT,
  );

  // Auto-select the top match once results land. Only seeds when nothing
  // is chosen so we don't overwrite the user's pick.
  useEffect(() => {
    if (!selectedKey && candidates.length > 0) {
      setSelectedKey(candidates[0]!.key);
    }
  }, [candidates, selectedKey]);

  const selected = candidates.find((c) => c.key === selectedKey);
  const lowConfidence = confidence > 0 && confidence < 0.55;

  const handleAdd = async (match: OpenLibrarySearchResult) => {
    if (adding) return;
    setAdding(true);
    setErrorMsg(null);
    try {
      const heroImage = match.coverUrlLarge ?? match.coverUrl ?? undefined;
      const newId = await addBook({
        title: match.title,
        author: match.author,
        format: "Paperback",
        coverGradient: FALLBACK_GRADIENT,
        visualStyle: settings.defaultVisualStyle,
        spoilerMode: settings.spoilerMode,
        currentChapter: 1,
        currentPage: 0,
        currentAudioTimestamp: "00:00:00",
        progress: 0,
        userNote: "",
        sourceType: "user-added",
        ...(heroImage ? { heroImage } : {}),
      });
      onClose();
      router.push(`/book/${newId}`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Couldn't add that book.",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleAddAsTyped = () =>
    void handleAdd({
      key: `read:${titleQ}:${authorQ}`,
      workKey: "",
      title: titleQ.trim(),
      author: authorQ.trim(),
      firstPublishYear: null,
      pageCount: null,
      coverUrl: null,
      coverUrlLarge: null,
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.scrim}
        onPress={() => {
          if (!adding) onClose();
        }}
      >
        <Pressable
          // eat presses inside the sheet so they don't dismiss the modal
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <View style={styles.headerTitleRow}>
                <Feather name="zap" size={14} color={colors.accent} />
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                  We think this is…
                </Text>
              </View>
              <Text
                style={[styles.headerSub, { color: colors.mutedForeground }]}
              >
                {lowConfidence
                  ? "The cover was hard to read. Pick the right edition or edit the search."
                  : "Pick the edition you want on your shelf, or edit the search if we got it wrong."}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={adding}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Searched-as / Edit ─────────────────────────────────────────── */}
          {!editing ? (
            <View
              style={[
                styles.searchedRow,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text
                style={[styles.searchedText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                <Text style={{ color: colors.mutedForeground }}>
                  Searching:{" "}
                </Text>
                {titleQ || "—"}{" "}
                <Text style={{ color: colors.mutedForeground }}>by</Text>{" "}
                {authorQ || "—"}
              </Text>
              <TouchableOpacity
                onPress={() => setEditing(true)}
                style={styles.editBtn}
              >
                <Feather name="edit-2" size={12} color={colors.accent} />
                <Text style={[styles.editBtnText, { color: colors.accent }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.editForm, { borderColor: colors.accent + "60", backgroundColor: colors.accent + "10" }]}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Title
                </Text>
                <TextInput
                  value={titleQ}
                  onChangeText={setTitleQ}
                  autoFocus
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Author
                </Text>
                <TextInput
                  value={authorQ}
                  onChangeText={setAuthorQ}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Results ─────────────────────────────────────────────────── */}
          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={styles.resultsContent}
          >
            {search.isLoading && (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                  Looking up matches on Open Library…
                </Text>
              </View>
            )}

            {search.isError && (
              <View
                style={[
                  styles.errorBox,
                  { borderColor: colors.destructive + "60", backgroundColor: colors.destructive + "10" },
                ]}
              >
                <Feather name="alert-circle" size={16} color={colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.errorTitle, { color: colors.destructive }]}
                  >
                    Couldn't reach Open Library
                  </Text>
                  <Text
                    style={[styles.muted, { color: colors.mutedForeground }]}
                  >
                    Try again, or hit Edit to revise the search.
                  </Text>
                </View>
              </View>
            )}

            {!search.isLoading &&
              !search.isError &&
              search.isFetched &&
              candidates.length === 0 && (
                <View
                  style={[
                    styles.emptyBox,
                    { borderColor: colors.border },
                  ]}
                >
                  <Feather name="book" size={22} color={colors.mutedForeground} />
                  <Text
                    style={[styles.emptyTitle, { color: colors.foreground }]}
                  >
                    No matches on Open Library
                  </Text>
                  <Text
                    style={[styles.muted, { color: colors.mutedForeground, textAlign: "center" }]}
                  >
                    We couldn't find an exact match. Add the book using what
                    we read off the cover, or edit the search.
                  </Text>
                  <View style={styles.emptyActions}>
                    <TouchableOpacity
                      onPress={handleAddAsTyped}
                      disabled={adding || !titleQ.trim() || !authorQ.trim()}
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: colors.accent, opacity: adding ? 0.6 : 1 },
                      ]}
                    >
                      <Text
                        style={[styles.primaryBtnText, { color: "#08081a" }]}
                      >
                        {adding ? "Adding…" : `Add "${titleQ.trim() || "—"}" as-is`}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditing(true)}
                      style={[styles.outlineBtn, { borderColor: colors.border }]}
                    >
                      <Feather name="edit-2" size={12} color={colors.foreground} />
                      <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>
                        Edit search
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            {candidates.map((c) => {
              const active = selectedKey === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setSelectedKey(c.key)}
                  activeOpacity={0.85}
                  style={[
                    styles.candidate,
                    {
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active
                        ? colors.accent + "10"
                        : colors.card,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.coverWrap,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    {c.coverUrl ? (
                      <Image
                        source={{ uri: c.coverUrl }}
                        style={styles.coverImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather
                        name="book"
                        size={24}
                        color={colors.mutedForeground}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={2}
                      style={[styles.candidateTitle, { color: colors.foreground }]}
                    >
                      {c.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.candidateMeta, { color: colors.mutedForeground }]}
                    >
                      by {c.author}
                      {c.firstPublishYear ? ` · ${c.firstPublishYear}` : ""}
                      {c.pageCount ? ` · ${c.pageCount}p` : ""}
                    </Text>
                  </View>
                  {active && (
                    <View
                      style={[
                        styles.checkDot,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <Feather name="check" size={12} color="#08081a" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {errorMsg && (
              <Text style={[styles.errorInline, { color: colors.destructive }]}>
                {errorMsg}
              </Text>
            )}
          </ScrollView>

          {/* Footer ─────────────────────────────────────────────────── */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              disabled={adding}
              style={styles.ghostBtn}
            >
              <Text
                style={[styles.ghostBtnText, { color: colors.mutedForeground }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => selected && handleAdd(selected)}
              disabled={!selected || adding || search.isLoading}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: !selected || adding || search.isLoading ? 0.4 : 1,
                },
              ]}
            >
              {adding && (
                <ActivityIndicator size="small" color="#08081a" />
              )}
              <Text style={[styles.primaryBtnText, { color: "#08081a" }]}>
                {adding ? "Adding…" : "Add to library"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  headerTextWrap: { flex: 1, gap: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  closeBtn: { padding: 6 },
  searchedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchedText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  editForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  field: { gap: 4 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  resultsScroll: { maxHeight: 360 },
  resultsContent: { gap: 8, paddingBottom: 8 },
  centerState: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  muted: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  candidate: {
    flexDirection: "row",
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  coverWrap: {
    width: 56,
    height: 80,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%" },
  candidateTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  candidateMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  errorInline: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  ghostBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
