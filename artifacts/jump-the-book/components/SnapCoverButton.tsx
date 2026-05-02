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
import { useIdentifyBookCover } from "@/hooks/useRemoteLibrary";

import CoverPickerModal from "./CoverPickerModal";

interface Props {
  /** Render as a small pill (default) or a big dashed tile. */
  variant?: "pill" | "tile";
  /** Override label text. */
  label?: string;
  /** Long edge target before JPEG re-encode. */
  maxEdge?: number;
  /** JPEG quality for the compressed upload (0..1). */
  quality?: number;
}

/**
 * Mobile equivalent of the web's `<SnapCoverButton>`.
 *
 * Flow:
 *  1. Launch the camera (or photo library on web/desktop) via expo-image-picker.
 *  2. Resize to a long-edge of `maxEdge` px and re-encode as JPEG via
 *     expo-image-manipulator so the data URL stays comfortably below the
 *     server's body-size limit.
 *  3. POST the data URL to /api/books/cover/identify (gpt-5.4 vision).
 *  4. Open `<CoverPickerModal>` with the model-read (title, author) so the
 *     user can confirm the Open Library edition before it lands on their
 *     shelf. The picker calls into `useLibrary().addBook` — the same
 *     dedup path Smart Setup will use, so re-snapping the same book just
 *     navigates back to the existing shelf row.
 */
export default function SnapCoverButton({
  variant = "pill",
  label = "Snap a cover",
  maxEdge = 1280,
  quality = 0.85,
}: Props) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<{
    title: string;
    author: string;
    confidence: number;
  } | null>(null);
  const identify = useIdentifyBookCover();

  const handlePick = useCallback(async () => {
    if (busy) return;

    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }

    // On native we want the back camera; on web fall back to the photo
    // library picker (works in dev preview without granting camera perms).
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
            "We use your camera to read the cover. You can enable it in Settings.",
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

      // Resize so the long edge is `maxEdge` and re-encode as JPEG. Phone
      // shots are often 4032×3024 — without this the base64 payload would
      // blow past the API's body limit.
      const { uri: smallUri, base64 } = await ImageManipulator.manipulateAsync(
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

      if (!base64) {
        throw new Error("Could not encode the photo. Try again.");
      }
      void smallUri; // we only need the base64 here

      const dataUrl = `data:image/jpeg;base64,${base64}`;
      const result = await identify.mutateAsync(dataUrl);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }

      // The endpoint already 422s on unreadable covers, so anything
      // reaching here has a non-empty title+author.
      setPicker({
        title: result.title,
        author: result.author,
        confidence: result.confidence,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Couldn't read that cover", msg);
    } finally {
      setBusy(false);
    }
  }, [busy, identify, maxEdge, quality]);

  if (variant === "tile") {
    return (
      <>
        <TouchableOpacity
          onPress={handlePick}
          disabled={busy}
          activeOpacity={0.85}
          style={[
            styles.tile,
            {
              borderColor: colors.accent + "60",
              backgroundColor: colors.accent + "10",
              opacity: busy ? 0.6 : 1,
            },
          ]}
          accessibilityLabel="Snap a photo of a book cover"
        >
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Feather name="camera" size={28} color={colors.accent} />
          )}
          <Text style={[styles.tileTitle, { color: colors.accent }]}>
            {busy ? "Reading cover…" : label}
          </Text>
          <Text style={[styles.tileSub, { color: colors.mutedForeground }]}>
            Point your camera at any book
          </Text>
        </TouchableOpacity>
        {picker && (
          <CoverPickerModal
            visible={true}
            guessedTitle={picker.title}
            guessedAuthor={picker.author}
            confidence={picker.confidence}
            onClose={() => setPicker(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePick}
        disabled={busy}
        activeOpacity={0.85}
        style={[
          styles.pill,
          {
            borderColor: colors.accent + "60",
            opacity: busy ? 0.6 : 1,
          },
        ]}
        accessibilityLabel="Snap a photo of a book cover"
      >
        {busy ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Feather name="camera" size={14} color={colors.accent} />
        )}
        <Text style={[styles.pillText, { color: colors.accent }]}>
          {busy ? "Reading…" : label}
        </Text>
      </TouchableOpacity>
      {picker && (
        <CoverPickerModal
          visible={true}
          guessedTitle={picker.title}
          guessedAuthor={picker.author}
          confidence={picker.confidence}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tile: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  tileTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tileSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
