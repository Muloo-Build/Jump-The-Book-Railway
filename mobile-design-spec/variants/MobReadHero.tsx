// Reading variant — Hero scene at top, text scrolls under, floating control puck.
// Direct port of source-from-canvas/mobile-screens.jsx → MobReadHero.

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ChevronLeft, Heart, Film, Settings, Moon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MobShell } from "../components/MobShell";
import { SceneArt } from "../components/SceneArt";
import { IconButton } from "../components/IconButton";
import { Tag } from "../components/Tag";
import { colors, fontFamily, type, space } from "../tokens";

export function MobReadHero({ artStyle = "cinematic" }: { artStyle?: "cinematic" | "comic" | "watercolour" }) {
  return (
    <MobShell hideHeader hideTabBar>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero scene */}
        <View style={styles.heroWrap}>
          <SceneArt seed="read-hero" style={artStyle} ratio="1/1" />
          <LinearGradient
            colors={["transparent", colors.bg] as [string, string]}
            locations={[0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.topRow}>
            <IconButton dark><ChevronLeft size={14} color={colors.text} strokeWidth={1.4} /></IconButton>
            <Tag>Ch. 14 · Scene 02</Tag>
            <IconButton dark><Heart size={14} color={colors.text} strokeWidth={1.4} /></IconButton>
          </View>
          <View style={styles.pullquoteWrap}>
            <Text style={[type.pullquote, { textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 8 }]}>
              "If you are afraid, walk slower."
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={{ padding: 24, paddingBottom: 100 }}>
          <Text style={[type.eyebrowMute, { marginBottom: 14 }]}>The Long Corridor</Text>
          <Text style={[type.reader, { textIndent: 0 } as any]}>
            The corridor was longer than she remembered, lit only by the sodium glow of dying lamps that hummed like tired bees. Bryce moved through it like she'd done it a thousand times before — because she had.
          </Text>
          <Text style={[type.reader, { marginTop: 14 }]}>
            Her boots, soft on the stone, made no sound. The walls leaned inward as if listening. Somewhere ahead, a door. Somewhere behind, a memory of a door.
          </Text>
          <Text style={[type.reader, { marginTop: 14 }]}>
            "If you are afraid," her mother had said once, "walk slower." So she did. She walked slower. The lights flickered, and the corridor exhaled.
          </Text>
        </View>
      </ScrollView>

      {/* Floating reader controls */}
      <View style={styles.puck}>
        <IconButton><Film size={13} color={colors.text} strokeWidth={1.4} /></IconButton>
        <IconButton><Settings size={13} color={colors.text} strokeWidth={1.4} /></IconButton>
        <IconButton><Moon size={13} color={colors.text} strokeWidth={1.4} /></IconButton>
      </View>
    </MobShell>
  );
}

const styles = StyleSheet.create({
  heroWrap: { position: "relative", height: 320 },
  topRow: {
    position: "absolute",
    top: 50, left: 16, right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pullquoteWrap: { position: "absolute", bottom: 18, left: 20, right: 20 },
  puck: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 4,
    padding: 4,
    backgroundColor: "rgba(15,16,21,0.85)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
