import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useClaimOrphanScenes } from "@/hooks/useRemoteLibrary";

interface Props {
  visible: boolean;
  /** The orphan group to recover. Null when the modal is dismissed. */
  group: { userBookId: string; sceneCount: number } | null;
  onClose: () => void;
  /** Fired after a successful claim with the new book id. */
  onClaimed?: (newBookId: string) => void;
}

/**
 * Mobile claim flow for orphan scene groups.
 *
 * The server requires title + author so it can either reuse a matching
 * book row or build a fresh one and re-point all matching scenes. We
 * keep the form intentionally minimal — visual style and spoiler mode
 * inherit from the user's defaults, which the user can later edit from
 * the book detail "Edit details" sheet.
 */
export default function ClaimOrphanModal({
  visible,
  group,
  onClose,
  onClaimed,
}: Props) {
  const colors = useColors();
  const claim = useClaimOrphanScenes();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    if (visible) {
      setTitle("");
      setAuthor("");
    }
  }, [visible]);

  const submit = async () => {
    if (!group) return;
    const t = title.trim();
    const a = author.trim();
    if (!t || !a) {
      Alert.alert("Title and author are required.");
      return;
    }
    try {
      const res = await claim.mutateAsync({
        userBookId: group.userBookId,
        title: t,
        author: a,
      });
      onClaimed?.(res.book.id);
      onClose();
    } catch (err) {
      Alert.alert(
        "Couldn't recover scenes",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  return (
    <Modal
      visible={visible && !!group}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="help-circle" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Recover {group?.sceneCount ?? 0}{" "}
                {group?.sceneCount === 1 ? "scene" : "scenes"}
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                Tell us which book they belonged to and we'll re-attach them to
                a fresh entry in your library.
              </Text>
            </View>
          </View>

          <View style={styles.fields}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Book title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. The Hobbit"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              autoFocus
              returnKeyType="next"
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Author
            </Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="e.g. J.R.R. Tolkien"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.btn,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              disabled={claim.isPending}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={claim.isPending}
              style={[styles.btn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
            >
              {claim.isPending ? (
                <ActivityIndicator color="#08081a" size="small" />
              ) : (
                <Text style={[styles.btnText, { color: "#08081a" }]}>
                  Recover scenes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4 },
  fields: { gap: 8 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 110,
    alignItems: "center",
  },
  btnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
