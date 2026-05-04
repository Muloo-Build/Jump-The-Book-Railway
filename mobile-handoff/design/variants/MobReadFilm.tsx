// Reading variant — Filmstrip rail of scenes alongside the reader text.
// Direct port of source-from-canvas/mobile-screens.jsx → MobReadFilm.

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Eye, Settings } from "lucide-react-native";
import { MobShell } from "../components/MobShell";
import { SceneArt } from "../components/SceneArt";
import { colors, fontFamily, type, space } from "../tokens";

const FRAMES = [
  { active: false, seed: "fs1", n: "01" },
  { active: true,  seed: "fs2", n: "02" },
  { active: false, seed: "fs3", n: "03", dim: true },
  { active: false, seed: "fs4", n: "04", dim: true },
];

export function MobReadFilm({ artStyle = "cinematic" }: { artStyle?: "cinematic" | "comic" | "watercolour" }) {
  return (
    <MobShell minimal>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={type.eyebrowMute}>Ch. 14 · 62%</Text>
          <Settings size={14} color={colors.textMute} strokeWidth={1.4} />
        </View>

        <View style={styles.body}>
          {/* Filmstrip rail */}
          <View style={styles.rail}>
            <View style={styles.railLine} />
            {FRAMES.map((f, i) => (
              <View key={i} style={{ position: "relative" }}>
                <View style={[
                  styles.frame,
                  f.active && styles.frameActive,
                  f.dim && { opacity: 0.35 },
                ]}>
                  <SceneArt seed={f.seed} style={artStyle} ratio="3/4" />
                  {f.dim && (
                    <View style={styles.dimOverlay}>
                      <Eye size={12} color={colors.textMute} strokeWidth={1.4} />
                    </View>
                  )}
                </View>
                <Text style={[styles.frameNum, { color: f.active ? colors.accent : colors.textMute }]}>
                  {f.n}
                </Text>
              </View>
            ))}
          </View>

          {/* Reader text */}
          <View style={styles.reader}>
            <Text style={styles.chapterTitle}>The Long Corridor</Text>
            <Text style={type.reader}>
              The corridor was longer than she remembered, lit only by the sodium glow of dying lamps that hummed like tired bees. Bryce moved through it like she'd done it a thousand times before — because she had.
            </Text>
            <Text style={[type.reader, { marginTop: 14 }]}>
              Her boots, soft on the stone, made no sound. The walls leaned inward as if listening.
            </Text>
            <Text style={[type.reader, { marginTop: 14 }]}>
              "If you are afraid," her mother had said once, "walk slower." So she did.
            </Text>
          </View>
        </View>
      </ScrollView>
    </MobShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  body: { flexDirection: "row", paddingBottom: 100 },
  rail: {
    width: 56,
    paddingLeft: 12,
    flexDirection: "column",
    gap: 8,
    position: "relative",
  },
  railLine: {
    position: "absolute",
    left: 23, top: 0, bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  frame: {
    width: 40, height: 52,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  frameActive: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,11,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  frameNum: {
    position: "absolute",
    left: -2, top: -3,
    fontFamily: fontFamily.mono,
    fontSize: 8,
    letterSpacing: 1,
  },
  reader: { flex: 1, paddingHorizontal: 16, paddingRight: space.xl },
  chapterTitle: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
});
