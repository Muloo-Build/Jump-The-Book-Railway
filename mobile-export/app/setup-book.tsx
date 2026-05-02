import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SnapPageButton from "@/components/SnapPageButton";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import {
  EMPTY_DRAFT,
  useBookBible,
  useGenerateBibleDraft,
  useSaveBookBible,
  type BibleDraft,
} from "@/hooks/useBookBible";

const STEPS = [
  { n: 1, title: "Identify" },
  { n: 2, title: "Build" },
  { n: 3, title: "Review" },
];

interface BibleEditorValue {
  draft: BibleDraft;
  userNotes: string;
  focusAreas: string[];
  avoidNotes: string;
}

const DEFAULT_VALUE: BibleEditorValue = {
  draft: EMPTY_DRAFT,
  userNotes: "",
  focusAreas: [],
  avoidNotes: "",
};

/**
 * Mobile mirror of the web's `/setup-book` Smart Setup wizard.
 *
 * Three steps:
 *   1. Identify — title/author/series + optional snap-page excerpt.
 *   2. Build — loader while POST /api/books/context/search returns a draft.
 *   3. Review — light editor (summary + non-spoiler synopsis + notes)
 *      and a save button that creates the user_book and writes the bible.
 *
 * Deep editing of characters/factions/locations remains web-only for now;
 * mobile prioritizes "I'm holding a book — get me into the experience
 * fast" while web stays the power-editor surface. Both sides write to the
 * same /api/me/books/:id/bible endpoint, so edits round-trip cleanly.
 *
 * Re-entry path: navigating with `?bookId=…` skips identify+build and
 * jumps straight into review of the existing bible.
 */
export default function SetupBookScreen() {
  const params = useLocalSearchParams<{ bookId?: string }>();
  const editingBookId = params.bookId ?? null;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addBook, settings } = useLibrary();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [series, setSeries] = useState("");
  const [bookNumber, setBookNumber] = useState("");
  const [chapter, setChapter] = useState("1");
  const [excerpt, setExcerpt] = useState("");
  const [whatJustHappened, setWhatJustHappened] = useState("");
  const [bibleValue, setBibleValue] = useState<BibleEditorValue>(DEFAULT_VALUE);
  const [saving, setSaving] = useState(false);

  const generateDraft = useGenerateBibleDraft();
  const saveBible = useSaveBookBible();
  const existingBibleQ = useBookBible(editingBookId);

  // ── Edit-existing-bible mode ────────────────────────────────────────────
  // Hydrate from the saved bible the first time it lands, then jump
  // straight to review. We only depend on the bible payload — local edits
  // shouldn't be wiped if the query refetches.
  const [hydratedFromExisting, setHydratedFromExisting] = useState(false);
  useEffect(() => {
    if (!editingBookId || hydratedFromExisting) return;
    const b = existingBibleQ.data?.bible;
    if (!b) return;
    setTitle(b.series ?? "");
    setBibleValue({
      draft: {
        series: b.series,
        bookNumber: b.bookNumber,
        genre: b.genre,
        tone: b.tone,
        settingSummary: b.settingSummary,
        visualStyleHints: b.visualStyleHints,
        nonSpoilerSummary: b.nonSpoilerSummary,
        publisherBlurb: b.publisherBlurb,
        factions: b.factions,
        locations: b.locations,
        species: b.species,
        ships: b.ships,
        technology: b.technology,
        importantObjects: b.importantObjects,
        characterProfiles: b.characterProfiles,
        sources: b.sources,
      },
      userNotes: b.userNotes,
      focusAreas: b.focusAreas,
      avoidNotes: b.avoidNotes,
    });
    setHydratedFromExisting(true);
    setStep(3);
  }, [editingBookId, existingBibleQ.data, hydratedFromExisting]);

  // ── Step handlers ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!title.trim() || !author.trim()) {
      Alert.alert("Title and author are required");
      return;
    }
    setStep(2);
    try {
      const res = await generateDraft.mutateAsync({
        title: title.trim(),
        author: author.trim(),
        series: series.trim() || undefined,
        bookNumber: bookNumber ? Number(bookNumber) : null,
      });
      setBibleValue({
        draft: res.draft,
        userNotes: "",
        focusAreas: [],
        avoidNotes: "",
      });
      setStep(3);
    } catch (err) {
      Alert.alert(
        "Couldn't build a bible draft",
        err instanceof Error ? err.message : "Try again in a moment.",
      );
      setStep(1);
    }
  };

  const handleSkipSearch = () => {
    if (!title.trim() || !author.trim()) {
      Alert.alert("Title and author are required");
      return;
    }
    setBibleValue({
      draft: {
        ...EMPTY_DRAFT,
        series: series.trim() || null,
        bookNumber: bookNumber ? Number(bookNumber) : null,
      },
      userNotes: "",
      focusAreas: [],
      avoidNotes: "",
    });
    setStep(3);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let bookId = editingBookId;
      if (!bookId) {
        bookId = await addBook({
          title: title.trim(),
          author: author.trim(),
          format: "Paperback",
          coverGradient: ["#1a1525", "#2d2440", "#453560"],
          visualStyle: settings.defaultVisualStyle,
          spoilerMode: settings.spoilerMode,
          currentChapter: parseInt(chapter, 10) || 1,
          currentPage: 0,
          currentAudioTimestamp: "00:00:00",
          progress: 0,
          userNote: whatJustHappened.trim(),
          sourceType: "user-added",
        });
      }
      await saveBible.mutateAsync({
        bookId,
        draft: bibleValue.draft,
        userNotes: bibleValue.userNotes,
        focusAreas: bibleValue.focusAreas,
        avoidNotes: bibleValue.avoidNotes,
      });
      // The bible-mutation onSuccess primes the cache, so the book detail
      // screen will see the bible immediately on navigation.
      router.replace(`/book/${bookId}`);
    } catch (err) {
      Alert.alert(
        "Couldn't save your book bible",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;
  const bottomPad = insets.bottom + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <View style={styles.topTitleRow}>
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.topEyebrow, { color: colors.accent }]}>
              Smart Book Setup
            </Text>
          </View>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            {editingBookId ? "Edit your book bible" : "Add a new book"}
          </Text>
        </View>
      </View>

      <Stepper current={step} colors={colors} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollBody, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <Step1
            colors={colors}
            title={title}
            setTitle={setTitle}
            author={author}
            setAuthor={setAuthor}
            series={series}
            setSeries={setSeries}
            bookNumber={bookNumber}
            setBookNumber={setBookNumber}
            chapter={chapter}
            setChapter={setChapter}
            whatJustHappened={whatJustHappened}
            setWhatJustHappened={setWhatJustHappened}
            excerpt={excerpt}
            setExcerpt={setExcerpt}
            isSearching={generateDraft.isPending}
            onSearch={handleSearch}
            onSkip={handleSkipSearch}
          />
        )}

        {step === 2 && (
          <View
            style={[
              styles.loaderCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loaderTitle, { color: colors.foreground }]}>
              Building your book bible
            </Text>
            <Text style={[styles.loaderSub, { color: colors.mutedForeground }]}>
              Pulling together world, characters, locations, and tone for
              "{title.trim()}" by {author.trim()}. This usually takes 10–20
              seconds.
            </Text>
          </View>
        )}

        {step === 3 && (
          <Step3
            colors={colors}
            value={bibleValue}
            onChange={setBibleValue}
            saving={saving}
            isEditing={!!editingBookId}
            onBack={() => (editingBookId ? router.back() : setStep(1))}
            onSave={handleSave}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Stepper ────────────────────────────────────────────────────────────────
function Stepper({
  current,
  colors,
}: {
  current: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((s, i) => {
        const active = current === s.n;
        const done = current > s.n;
        return (
          <View key={s.n} style={styles.stepperItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: done
                    ? colors.accent + "30"
                    : active
                      ? colors.accent + "20"
                      : "transparent",
                  borderColor: done || active ? colors.accent : colors.border,
                },
              ]}
            >
              {done ? (
                <Feather name="check" size={11} color={colors.accent} />
              ) : (
                <Text style={[styles.stepNum, { color: active ? colors.accent : colors.mutedForeground }]}>
                  {s.n}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                { color: active ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {s.title}
            </Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Step 1: Identify ──────────────────────────────────────────────────────
interface Step1Props {
  colors: ReturnType<typeof useColors>;
  title: string;
  setTitle: (v: string) => void;
  author: string;
  setAuthor: (v: string) => void;
  series: string;
  setSeries: (v: string) => void;
  bookNumber: string;
  setBookNumber: (v: string) => void;
  chapter: string;
  setChapter: (v: string) => void;
  whatJustHappened: string;
  setWhatJustHappened: (v: string) => void;
  excerpt: string;
  setExcerpt: (v: string) => void;
  isSearching: boolean;
  onSearch: () => void;
  onSkip: () => void;
}

function Step1(p: Step1Props) {
  const c = p.colors;
  const canContinue = p.title.trim() && p.author.trim() && !p.isSearching;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row2}>
        <Field colors={c} label="Title*">
          <TextInput
            value={p.title}
            onChangeText={p.setTitle}
            placeholder="e.g. Zero Hour"
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>
        <Field colors={c} label="Author*">
          <TextInput
            value={p.author}
            onChangeText={p.setAuthor}
            placeholder="e.g. Craig Alanson"
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>
      </View>

      <View style={styles.row2}>
        <Field colors={c} label="Series (optional)">
          <TextInput
            value={p.series}
            onChangeText={p.setSeries}
            placeholder="e.g. Expeditionary Force"
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>
        <Field colors={c} label="Book #">
          <TextInput
            value={p.bookNumber}
            onChangeText={p.setBookNumber}
            placeholder="—"
            placeholderTextColor={c.mutedForeground}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>
      </View>

      <Field colors={c} label="Current chapter">
        <TextInput
          value={p.chapter}
          onChangeText={p.setChapter}
          placeholder="1"
          placeholderTextColor={c.mutedForeground}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
        />
      </Field>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <Text style={[styles.helpText, { color: c.mutedForeground }]}>
        Tell us where you are (optional — helps ground the visuals)
      </Text>

      <Field colors={c} label="What just happened?">
        <TextInput
          value={p.whatJustHappened}
          onChangeText={p.setWhatJustHappened}
          placeholder="A line or two about your current scene."
          placeholderTextColor={c.mutedForeground}
          multiline
          style={[styles.input, styles.multiline, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
        />
      </Field>

      <Field colors={c} label="Paste or snap a short excerpt (optional)">
        <TextInput
          value={p.excerpt}
          onChangeText={p.setExcerpt}
          placeholder="A passage from the chapter you're on."
          placeholderTextColor={c.mutedForeground}
          multiline
          maxLength={6000}
          style={[styles.input, styles.multilineLg, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
        />
        <View style={styles.snapRow}>
          <SnapPageButton current={p.excerpt} onChange={p.setExcerpt} />
          {p.excerpt.length > 0 && (
            <TouchableOpacity onPress={() => p.setExcerpt("")}>
              <Text style={[styles.linkText, { color: c.mutedForeground }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Field>

      <View style={styles.actionsCol}>
        <TouchableOpacity
          onPress={p.onSearch}
          disabled={!canContinue}
          style={[
            styles.primaryBtn,
            { backgroundColor: c.accent, opacity: !canContinue ? 0.4 : 1 },
          ]}
        >
          {p.isSearching ? (
            <ActivityIndicator size="small" color="#08081a" />
          ) : (
            <Feather name="zap" size={14} color="#08081a" />
          )}
          <Text style={[styles.primaryBtnText, { color: "#08081a" }]}>
            {p.isSearching ? "Searching…" : "Search book context"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={p.onSkip}
          disabled={p.isSearching}
          style={[styles.outlineBtn, { borderColor: c.border }]}
        >
          <Text style={[styles.outlineBtnText, { color: c.foreground }]}>
            Skip and set up manually
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 3: Review ────────────────────────────────────────────────────────
interface Step3Props {
  colors: ReturnType<typeof useColors>;
  value: BibleEditorValue;
  onChange: (v: BibleEditorValue) => void;
  saving: boolean;
  isEditing: boolean;
  onBack: () => void;
  onSave: () => void;
}

function Step3({ colors: c, value, onChange, saving, isEditing, onBack, onSave }: Step3Props) {
  const draft = value.draft;
  const counts = useMemo(
    () => [
      { label: "Characters", n: draft.characterProfiles.length },
      { label: "Locations", n: draft.locations.length },
      { label: "Factions", n: draft.factions.length },
      { label: "Species", n: draft.species.length },
      { label: "Tech", n: draft.technology.length },
    ],
    [draft],
  );

  const setDraft = (patch: Partial<BibleDraft>) =>
    onChange({ ...value, draft: { ...value.draft, ...patch } });

  return (
    <View style={{ gap: 12 }}>
      <View
        style={[
          styles.card,
          { backgroundColor: c.accent + "10", borderColor: c.accent + "40" },
        ]}
      >
        <View style={styles.tipRow}>
          <Feather name="zap" size={14} color={c.accent} />
          <Text style={[styles.tipText, { color: c.foreground }]}>
            Review & save your story profile
          </Text>
        </View>
        <Text style={[styles.helpText, { color: c.mutedForeground }]}>
          We may have missed details. Tweak the summary and notes below — for
          deep edits to characters, factions, and locations, open this book on
          the web app, where the full editor lives.
        </Text>
      </View>

      {draft.genre.length + draft.tone.length > 0 && (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Snapshot</Text>
          {draft.genre.length > 0 && (
            <Text style={[styles.metaLine, { color: c.mutedForeground }]}>
              <Text style={{ color: c.foreground }}>Genre:</Text>{" "}
              {draft.genre.join(", ")}
            </Text>
          )}
          {draft.tone.length > 0 && (
            <Text style={[styles.metaLine, { color: c.mutedForeground }]}>
              <Text style={{ color: c.foreground }}>Tone:</Text>{" "}
              {draft.tone.join(", ")}
            </Text>
          )}
          <View style={styles.countsRow}>
            {counts.map((k) => (
              <View
                key={k.label}
                style={[
                  styles.countChip,
                  {
                    backgroundColor: c.background,
                    borderColor: c.border,
                  },
                ]}
              >
                <Text style={[styles.countNum, { color: c.foreground }]}>
                  {k.n}
                </Text>
                <Text style={[styles.countLabel, { color: c.mutedForeground }]}>
                  {k.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Field colors={c} label="Setting summary">
          <TextInput
            value={draft.settingSummary}
            onChangeText={(v) => setDraft({ settingSummary: v })}
            multiline
            placeholder="World, time period, key locations…"
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, styles.multilineLg, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>

        <Field colors={c} label="Non-spoiler synopsis">
          <TextInput
            value={draft.nonSpoilerSummary}
            onChangeText={(v) => setDraft({ nonSpoilerSummary: v })}
            multiline
            placeholder="What's safe to reference without spoilers?"
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, styles.multilineLg, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>

        <Field colors={c} label="Your notes">
          <TextInput
            value={value.userNotes}
            onChangeText={(v) => onChange({ ...value, userNotes: v })}
            multiline
            placeholder="Personal context — pronunciation, head-canon, anything you want the visuals to honor."
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, styles.multiline, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>

        <Field colors={c} label="Avoid notes">
          <TextInput
            value={value.avoidNotes}
            onChangeText={(v) => onChange({ ...value, avoidNotes: v })}
            multiline
            placeholder="Anything we should NOT show or reference."
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, styles.multiline, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          />
        </Field>
      </View>

      <View style={styles.reviewActions}>
        <TouchableOpacity
          onPress={onBack}
          disabled={saving}
          style={styles.ghostBtn}
        >
          <Feather name="arrow-left" size={14} color={c.mutedForeground} />
          <Text style={[styles.ghostBtnText, { color: c.mutedForeground }]}>
            {isEditing ? "Back to book" : "Back"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[
            styles.primaryBtn,
            { backgroundColor: c.accent, opacity: saving ? 0.6 : 1 },
          ]}
        >
          {saving && <ActivityIndicator size="small" color="#08081a" />}
          <Feather name={isEditing ? "check" : "book-open"} size={14} color="#08081a" />
          <Text style={[styles.primaryBtnText, { color: "#08081a" }]}>
            {saving ? "Saving…" : isEditing ? "Save bible" : "Save & open book"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────
function Field({
  label,
  colors: c,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleWrap: { flex: 1, gap: 4, paddingTop: 6 },
  topTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  topEyebrow: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  topTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  stepperItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stepNum: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stepLine: { width: 16, height: 1, marginHorizontal: 4 },
  scrollBody: { paddingHorizontal: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  loaderCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  loaderTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  loaderSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  row2: { flexDirection: "row", gap: 10 },
  field: { flex: 1, gap: 6 },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  multiline: { minHeight: 64, textAlignVertical: "top" },
  multilineLg: { minHeight: 110, textAlignVertical: "top" },
  divider: { height: 1, marginVertical: 4 },
  helpText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  snapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  linkText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionsCol: { gap: 8, marginTop: 4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ghostBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  metaLine: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  countsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  countChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  countNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  countLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  reviewActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
});
