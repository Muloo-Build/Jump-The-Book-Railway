import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { VisualStyle, VISUAL_STYLE_LABELS } from "@/data/books";
import { useColors } from "@/hooks/useColors";

const STYLE_DESCRIPTIONS: Record<VisualStyle, string> = {
  "comic-book": "Bold lines & panels",
  watercolour: "Soft, painterly washes",
  "dark-cinematic": "Moody film stills",
  "animated-storybook": "Warm illustrated pages",
  "manga-inspired": "Expressive ink lines",
  "fantasy-illustration": "Rich world-building art",
};

interface StyleSelectorProps {
  value: VisualStyle;
  onChange: (style: VisualStyle) => void;
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const colors = useColors();
  const styles_list = Object.keys(VISUAL_STYLE_LABELS) as VisualStyle[];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {styles_list.map((style) => {
        const active = value === style;
        return (
          <TouchableOpacity
            key={style}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onChange(style)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {VISUAL_STYLE_LABELS[style]}
            </Text>
            <Text
              style={[
                styles.desc,
                { color: active ? colors.primaryForeground + "cc" : colors.mutedForeground },
              ]}
            >
              {STYLE_DESCRIPTIONS[style]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, gap: 10 },
  pill: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 140,
    gap: 2,
  },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
