import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Book, UserLibraryItem, VISUAL_STYLE_LABELS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const HERO_IMAGES: Record<string, any> = {
  "alice-hero": require("../assets/images/alice-hero.png"),
  "dracula-hero": require("../assets/images/dracula-hero.png"),
  "frankenstein-hero": require("../assets/images/frankenstein-hero.png"),
  "sherlock-hero": require("../assets/images/sherlock-hero.png"),
};

type BookCardProps =
  | { type: "demo"; book: Book; onPress?: () => void }
  | {
      type: "user";
      book: UserLibraryItem;
      onPress?: () => void;
      onDelete?: () => void;
    };

export function BookCard(props: BookCardProps) {
  const colors = useColors();
  const isDemo = props.type === "demo";
  const book = props.book;

  const title = book.title;
  const author = book.author;
  const progress = book.progress;
  const gradient = (book as Book).coverGradient ?? ["#1a1a4e", "#4a1a6e"];
  const heroImage = isDemo ? (book as Book).heroImage : undefined;
  const visualStyle = isDemo
    ? VISUAL_STYLE_LABELS[(book as Book).visualStyle]
    : VISUAL_STYLE_LABELS[(book as UserLibraryItem).visualStyle];

  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
    } else if (isDemo) {
      router.push(`/book/${(book as Book).id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.coverWrap}>
        {heroImage && HERO_IMAGES[heroImage] ? (
          <Image
            source={HERO_IMAGES[heroImage]}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={gradient as [string, string, ...string[]]}
            style={styles.coverGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={styles.coverOverlay} />
        <View style={styles.coverContent}>
          <Text style={styles.coverTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.coverAuthor}>{author}</Text>
        </View>
        {isDemo && (
          <View style={[styles.demoBadge, { backgroundColor: colors.gold + "30" }]}>
            <Text style={[styles.demoText, { color: colors.gold }]}>PUBLIC DOMAIN</Text>
          </View>
        )}
      </View>

      <View style={[styles.info, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <View style={[styles.stylePill, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[styles.styleText, { color: colors.accent }]}>
              {visualStyle}
            </Text>
          </View>
          {!isDemo && (
            <Text style={[styles.formatText, { color: colors.mutedForeground }]}>
              {(book as UserLibraryItem).format}
            </Text>
          )}
        </View>

        {progress > 0 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${progress}%` as any,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {progress}%
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.openBtn, { backgroundColor: colors.primary }]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={[styles.openBtnText, { color: colors.primaryForeground }]}>
            Open Companion
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 16,
  },
  coverWrap: {
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  coverContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  coverAuthor: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  demoBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demoText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  info: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stylePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  styleText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  formatText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    width: 32,
    textAlign: "right",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  openBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
