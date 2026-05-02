import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useLibrary, BookPosition } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";

interface PositionEntryProps {
  visible: boolean;
  bookId: string;
  bookTitle: string;
  bookFormat: string;
  totalChapters?: number;
  totalPages?: number;
  totalDurationMins?: number;
  onClose: () => void;
  onSave: (position: Omit<BookPosition, "lastUpdated">) => void;
}

function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number).reverse();
  let mins = 0;
  if (parts[0]) mins += parts[0] / 60;
  if (parts[1]) mins += parts[1];
  if (parts[2]) mins += parts[2] * 60;
  return mins;
}

function formatTimestamp(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PositionEntry({
  visible,
  bookId,
  bookTitle,
  bookFormat,
  totalChapters = 30,
  totalPages = 300,
  totalDurationMins = 600,
  onClose,
  onSave,
}: PositionEntryProps) {
  const colors = useColors();
  const { getPosition } = useLibrary();
  const isAudio = bookFormat === "Audible";

  const existing = getPosition(bookId);
  const [chapter, setChapter] = useState(
    existing ? String(existing.chapter) : "1"
  );
  const [page, setPage] = useState(existing ? String(existing.page) : "1");
  const [timestamp, setTimestamp] = useState(
    existing?.timestamp ?? "00:00:00"
  );

  useEffect(() => {
    if (visible) {
      const pos = getPosition(bookId);
      if (pos) {
        setChapter(String(pos.chapter));
        setPage(String(pos.page));
        setTimestamp(pos.timestamp ?? "00:00:00");
      }
    }
  }, [visible, bookId, getPosition]);

  const calcPercent = () => {
    if (isAudio) {
      const mins = parseTimestamp(timestamp);
      return Math.min(100, Math.round((mins / totalDurationMins) * 100));
    }
    const ch = parseInt(chapter || "1", 10);
    const pg = parseInt(page || "1", 10);
    const chPct = (ch - 1) / totalChapters;
    const pgPct = pg / totalPages;
    return Math.min(100, Math.round(Math.max(chPct, pgPct) * 100));
  };

  const handleSave = () => {
    const ch = parseInt(chapter || "1", 10);
    const pg = parseInt(page || "1", 10);
    const pct = calcPercent();
    onSave({
      bookId,
      bookFormat,
      chapter: ch,
      page: pg,
      timestamp,
      percentComplete: pct,
    });
    onClose();
  };

  const pct = calcPercent();

  const QUICK_CHAPTERS = [1, 2, 3, 5, 10, 15, 20, 25];
  const QUICK_TIMESTAMPS = ["00:30:00", "01:00:00", "02:00:00", "03:00:00", "05:00:00"];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                Where are you?
              </Text>
              <Text style={[styles.sheetSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {bookTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {isAudio ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Timestamp</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  value={timestamp}
                  onChangeText={setTimestamp}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>Quick set</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                  {QUICK_TIMESTAMPS.map((ts) => (
                    <TouchableOpacity
                      key={ts}
                      style={[styles.quickPill, { backgroundColor: timestamp === ts ? colors.primary : colors.muted, borderColor: colors.border }]}
                      onPress={() => setTimestamp(ts)}
                    >
                      <Text style={[styles.quickText, { color: timestamp === ts ? colors.primaryForeground : colors.foreground }]}>{ts}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Chapter</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                      value={chapter}
                      onChangeText={setChapter}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Page</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                      value={page}
                      onChangeText={setPage}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>
                <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>Jump to chapter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                  {QUICK_CHAPTERS.map((ch) => (
                    <TouchableOpacity
                      key={ch}
                      style={[styles.quickPill, { backgroundColor: parseInt(chapter) === ch ? colors.primary : colors.muted, borderColor: colors.border }]}
                      onPress={() => setChapter(String(ch))}
                    >
                      <Text style={[styles.quickText, { color: parseInt(chapter) === ch ? colors.primaryForeground : colors.foreground }]}>Ch {ch}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Progress preview */}
            <View style={[styles.progressCard, { backgroundColor: colors.muted }]}>
              <View style={styles.progressTop}>
                <Feather name="map-pin" size={14} color={colors.primary} />
                <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                  ~{pct}% through the book
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct}%` as any }]} />
              </View>
              <Text style={[styles.progressNote, { color: colors.mutedForeground }]}>
                Scenes up to this point will be unlocked
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Feather name="unlock" size={16} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              Update My Position
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, padding: 24, paddingBottom: 40,
    maxHeight: "85%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#555", alignSelf: "center", marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  body: { gap: 16, paddingBottom: 16 },
  fieldGroup: { gap: 6 },
  row: { flexDirection: "row", gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: "Inter_400Regular",
  },
  quickLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  quickRow: { gap: 8 },
  quickPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  quickText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  progressCard: { borderRadius: 14, padding: 14, gap: 10 },
  progressTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
