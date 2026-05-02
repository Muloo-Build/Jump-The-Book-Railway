import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface LibraryConnectModalProps {
  visible: boolean;
  onClose: () => void;
  platform: "kindle" | "audible" | null;
}

export function LibraryConnectModal({
  visible,
  onClose,
  platform,
}: LibraryConnectModalProps) {
  const colors = useColors();

  const name = platform === "kindle" ? "Kindle" : "Audible";
  const icon: keyof typeof Feather.glyphMap =
    platform === "kindle" ? "book" : "headphones";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
            <Feather name={icon} size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Connect {name}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Jump the Book is designed to work beside the platforms you already
            use. Direct {name} syncing is planned, but for now you can add your
            current chapter, page or timestamp manually.
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              Coming Soon
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
              Add Manually Instead
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeRow}>
            <Text style={[styles.closeText, { color: colors.mutedForeground }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  closeRow: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
