import React from "react";
import { View, StyleSheet, StatusBar, SafeAreaView } from "react-native";
import { colors } from "../tokens";

interface Props {
  children: React.ReactNode;
  /** When true, content renders edge-to-edge (e.g. cinematic playback). */
  fullBleed?: boolean;
}

export function ScreenBackground({ children, fullBleed }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {fullBleed ? children : <SafeAreaView style={styles.safe}>{children}</SafeAreaView>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
});
