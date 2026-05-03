import React from "react";
import { View, StyleSheet } from "react-native";
import { ScreenBackground } from "./ScreenBackground";
import { Header } from "./Header";
import { BottomTabBar } from "./BottomTabBar";
import { IconButton } from "./IconButton";
import { Search, Plus, ChevronLeft, Menu } from "lucide-react-native";
import { colors } from "../tokens";

interface Props {
  children: React.ReactNode;
  /** When true, swap the header for a back chevron + menu (reading mode look). */
  minimal?: boolean;
  /** Hide the header entirely (cinematic hero takeover). */
  hideHeader?: boolean;
  /** Hide the bottom tab bar (always hidden when `minimal`). */
  hideTabBar?: boolean;
  /** Currently selected tab in the bottom bar. */
  activeTab?: "library" | "scenes" | "upload" | "settings";
  onTabChange?: (key: "library" | "scenes" | "upload" | "settings") => void;
  /** Optional callbacks for the default header icons (Search + Plus). */
  onSearch?: () => void;
  onAdd?: () => void;
  onBack?: () => void;
  onMenu?: () => void;
}

/**
 * One-stop screen shell. Mirrors mobile-screens.jsx → MobShell.
 *
 *   <MobShell activeTab="library" onTabChange={setTab}>
 *     <ScrollView>…</ScrollView>
 *   </MobShell>
 */
export function MobShell({
  children,
  minimal,
  hideHeader,
  hideTabBar,
  activeTab = "library",
  onTabChange,
  onSearch,
  onAdd,
  onBack,
  onMenu,
}: Props) {
  return (
    <ScreenBackground>
      {!hideHeader && (
        minimal ? (
          <Header
            noBorder
            right={
              <IconButton onPress={onMenu}>
                <Menu size={14} color={colors.textDim} strokeWidth={1.4} />
              </IconButton>
            }
            // override left side: just the back chevron
            // (Header takes a fixed left layout — for true minimal mode you can
            //  swap to a custom row; this is a serviceable default.)
          />
        ) : (
          <Header
            right={
              <>
                <IconButton onPress={onSearch}>
                  <Search size={14} color={colors.text} strokeWidth={1.4} />
                </IconButton>
                <IconButton onPress={onAdd}>
                  <Plus size={14} color={colors.text} strokeWidth={1.4} />
                </IconButton>
              </>
            }
          />
        )
      )}
      <View style={styles.body}>{children}</View>
      {!minimal && !hideTabBar && (
        <BottomTabBar active={activeTab} onChange={onTabChange} />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
