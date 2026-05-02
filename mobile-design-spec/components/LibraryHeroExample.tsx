// Reference example — assembling the Library home screen the same way the
// web does it. Drop this directly into your screen, or use it as a recipe.

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Sparkles, Upload as UploadIcon } from "lucide-react-native";
import { ScreenBackground } from "./ScreenBackground";
import { Header } from "./Header";
import { PrimaryButton } from "./PrimaryButton";
import { GhostButton } from "./GhostButton";
import { SectionHeading } from "./SectionHeading";
import { BookTile } from "./BookTile";
import { Card } from "./Card";
import { Pill } from "./Pill";
import { colors, type, space, fontFamily } from "../tokens";

export function LibraryHeroExample() {
  return (
    <ScreenBackground>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingBottom: space.hero }}>
        {/* Eyebrow */}
        <View style={styles.eyebrowRow}>
          <View style={styles.dot} />
          <Text style={type.eyebrow}>Saturday · 11:54 PM</Text>
        </View>

        {/* Hero */}
        <Text style={[type.hero, { marginTop: space.sm }]}>
          Welcome to <Text style={type.heroAccent}>Jump the Book.</Text>
        </Text>
        <Text style={[type.bodyMuted, { marginTop: space.sm }]}>
          Your shelf is waiting. Add a book and we'll start painting the scenes.
        </Text>

        {/* CTA row */}
        <View style={styles.ctaRow}>
          <GhostButton label="Upload" icon={<UploadIcon size={16} color={colors.text} strokeWidth={1.75} />} />
          <PrimaryButton label="Add a book" icon={<Sparkles size={16} color={colors.goldOnBg} strokeWidth={1.75} />} />
        </View>

        {/* Save-your-collection banner */}
        <Card style={{ marginTop: space.xl, backgroundColor: "#1a1306", borderColor: "rgba(251,191,36,0.3)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Sparkles size={16} color={colors.gold} strokeWidth={1.75} />
            <Text style={{ fontFamily: fontFamily.sansSemibold, color: colors.goldSoft, fontSize: 14 }}>
              Save your collection
            </Text>
          </View>
          <Text style={[type.bodyMuted, { marginTop: 6 }]}>
            Sign in and every scene you generate is saved to your personal cinematic library — across devices, forever.
          </Text>
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
            <PrimaryButton label="Get started" size="sm" />
            <GhostButton label="Sign in" size="sm" />
          </View>
        </Card>

        {/* My books */}
        <SectionHeading title="My books" />
        {/* …grid of <BookTile /> goes here… */}

        {/* Classics */}
        <SectionHeading title="Classics" subtitle="Curated demo books · ready to visualise" />
        <View style={styles.grid}>
          <BookTile title="Alice in Wonderland" author="Lewis Carroll"
            gradient={["#3a1a6e", "#1a1a4e"]}
            tagline="A journey through the impossible." />
          <BookTile title="Dracula" author="Bram Stoker"
            gradient={["#5a0d0d", "#1a0808"]}
            tagline="Evil has a new face." />
        </View>

        {/* Pill example */}
        <View style={{ marginTop: space.xl }}>
          <Pill label="Recently generated" variant="gold" />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  ctaRow: { flexDirection: "row", gap: space.sm, marginTop: space.lg, justifyContent: "flex-end" },
  grid: { flexDirection: "row", gap: space.md },
});
