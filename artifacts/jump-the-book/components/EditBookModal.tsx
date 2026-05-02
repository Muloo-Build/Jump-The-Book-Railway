import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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

import { useColors } from "@/hooks/useColors";
import { usePatchRemoteBook } from "@/hooks/useRemoteLibrary";
import type { RemoteBook } from "@workspace/jump-the-book-shared";

interface Props {
  visible: boolean;
  book: RemoteBook | null;
  onClose: () => void;
  onSaved?: (updated: RemoteBook) => void;
}

/**
 * Mobile equivalent of the web's `<EditBookDialog>` (edit-mode only —
 * orphan recovery uses a separate flow on mobile).
 *
 * Lets the user fix the title, author, tagline, hero-image URL, and
 * total-chapter count after the fact (e.g. when the cover scanner
 * misread an obscure cover, or when they want a custom tagline).
 */
export default function EditBookModal({
  visible,
  book,
  onClose,
  onSaved,
}: Props) {
  const colors = useColors();
  const patch = usePatchRemoteBook();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reseed the form whenever the modal opens for a different book. We
  // depend on the *id* and the open flag, not on the `book` reference,
  // so parent re-renders that pass a fresh inline object literal don't
  // wipe in-progress edits.
  const bookId = book?.id ?? null;
  useEffect(() => {
    if (!visible || !book) return;
    setTitle(book.title);
    setAuthor(book.author);
    setTagline(book.tagline ?? "");
    setHeroImage(book.heroImage ?? "");
    setErrorMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, bookId]);

  const pending = patch.isPending;
  const canSave = title.trim().length > 0 && author.trim().length > 0;

  const submit = async () => {
    if (!book || !canSave || pending) return;
    setErrorMsg(null);
    try {
      const updated = await patch.mutateAsync({
        id: book.id,
        title: title.trim(),
        author: author.trim(),
        tagline: tagline.trim() || null,
        heroImage: heroImage.trim() || null,
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Couldn't save changes.",
      );
    }
  };

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
          if (!pending) onClose();
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <View style={styles.headerTitleRow}>
                <Feather name="edit-2" size={14} color={colors.accent} />
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                  Edit book details
                </Text>
              </View>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                Fix the title, author, or cover when something looks off.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={pending}
              style={styles.closeBtn}
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Field label="Title" colors={colors}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. The Name of the Wind"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </Field>

            <Field label="Author" colors={colors}>
              <TextInput
                value={author}
                onChangeText={setAuthor}
                placeholder="e.g. Patrick Rothfuss"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </Field>

            <Field label="Tagline (optional)" colors={colors}>
              <TextInput
                value={tagline}
                onChangeText={setTagline}
                placeholder="A short one-liner shown on the book page."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
                style={[
                  styles.input,
                  styles.multiline,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </Field>

            <Field label="Cover URL (optional)" colors={colors}>
              <TextInput
                value={heroImage}
                onChangeText={setHeroImage}
                placeholder="https://…"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </Field>

            {errorMsg && (
              <Text style={[styles.errorInline, { color: colors.destructive }]}>
                {errorMsg}
              </Text>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              disabled={pending}
              style={styles.ghostBtn}
            >
              <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={!canSave || pending}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: !canSave || pending ? 0.4 : 1,
                },
              ]}
            >
              {pending && <ActivityIndicator size="small" color="#08081a" />}
              <Text style={[styles.primaryBtnText, { color: "#08081a" }]}>
                {pending ? "Saving…" : "Save changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}

function Field({ label, colors, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
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
    marginBottom: 8,
  },
  headerTextWrap: { flex: 1, gap: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  closeBtn: { padding: 6 },
  body: { maxHeight: 480 },
  bodyContent: { gap: 12, paddingVertical: 8 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
});
