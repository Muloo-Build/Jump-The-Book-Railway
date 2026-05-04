import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Book, Sparkles, Plus, Settings } from "lucide-react-native";
import { colors, type } from "../tokens";

type TabKey = "library" | "scenes" | "upload" | "settings";

interface Props {
  active: TabKey;
  onChange?: (key: TabKey) => void;
}

const ITEMS: { key: TabKey; label: string; Icon: any }[] = [
  { key: "library",  label: "Library",  Icon: Book },
  { key: "scenes",   label: "Scenes",   Icon: Sparkles },
  { key: "upload",   label: "Upload",   Icon: Plus },
  { key: "settings", label: "Settings", Icon: Settings },
];

/**
 * Bottom tab bar with mono-style labels.
 * Use this OR React Navigation's bottom-tab navigator with the same look.
 * Mirrors mobile-screens.jsx → MobTabBar.
 *
 * Required: npx expo install lucide-react-native react-native-svg
 */
export function BottomTabBar({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {ITEMS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        const c = isActive ? colors.accent : colors.textMute;
        return (
          <Pressable key={key} onPress={() => onChange?.(key)} style={styles.item}>
            <Icon size={18} color={c} strokeWidth={1.4} />
            <Text style={[type.tabLabel, { color: c }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  item: { alignItems: "center", gap: 3 },
});
