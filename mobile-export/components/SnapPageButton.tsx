import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSnapPageOcr } from "@/hooks/useBookBible";

interface Props {
  /** Append the OCR'd text to this current value. */
  current: string;
  /** Receives the merged value (existing text + newline + OCR text). */
  onChange: (next: string) => void;
  /** Long edge target before JPEG re-encode. */
  maxEdge?: number;
  quality?: number;
}

/**
 * Mobile equivalent of the web's `<SnapPageButton>` (passage OCR).
 *
 * Photographs a single book page, resizes for upload, then POSTs to
 * /api/passage/ocr (vision model). The returned printed text is appended
 * to whatever the user has typed — appending instead of replacing means
 * a re-snap of the next page builds up a multi-page excerpt naturally.
 */
export default function SnapPageButton({
  current,
  onChange,
  maxEdge = 1600,
  quality = 0.85,
}: Props) {
  const colors = useColors();
  const ocr = useSnapPageOcr();
  const [busy, setBusy] = useState(false);

  const handlePick = useCallback(async () => {
    if (busy) return;

    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }

    setBusy(true);
    try {
      let asset: ImagePicker.ImagePickerAsset | null = null;

      if (Platform.OS === "web") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 1,
          base64: false,
        });
        if (!result.canceled && result.assets[0]) asset = result.assets[0];
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Camera access needed",
            "We use your camera to read the page. You can enable it in Settings.",
          );
          setBusy(false);
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 1,
          cameraType: ImagePicker.CameraType.back,
        });
        if (!result.canceled && result.assets[0]) asset = result.assets[0];
      }

      if (!asset) {
        setBusy(false);
        return;
      }

      const { base64 } = await ImageManipulator.manipulateAsync(
        asset.uri,
        asset.width && asset.height
          ? [
              {
                resize:
                  asset.width >= asset.height
                    ? { width: Math.min(asset.width, maxEdge) }
                    : { height: Math.min(asset.height, maxEdge) },
              },
            ]
          : [],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      if (!base64) throw new Error("Could not encode the photo. Try again.");

      const dataUrl = `data:image/jpeg;base64,${base64}`;
      const result = await ocr.mutateAsync(dataUrl);

      const cleaned = (result.text ?? "").trim();
      if (!cleaned) {
        Alert.alert(
          "Nothing readable",
          "We couldn't make out any printed text. Try a flatter, well-lit shot.",
        );
        return;
      }

      // Append rather than replace so multi-page snaps stack.
      const merged = current.trim()
        ? `${current.trim()}\n\n${cleaned}`
        : cleaned;
      onChange(merged);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Couldn't read that page", msg);
    } finally {
      setBusy(false);
    }
  }, [busy, current, maxEdge, ocr, onChange, quality]);

  return (
    <TouchableOpacity
      onPress={handlePick}
      disabled={busy}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { borderColor: colors.accent + "60", opacity: busy ? 0.6 : 1 },
      ]}
      accessibilityLabel="Snap a photo of a book page"
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Feather name="camera" size={14} color={colors.accent} />
      )}
      <Text style={[styles.text, { color: colors.accent }]}>
        {busy ? "Reading page…" : "Snap a page"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
