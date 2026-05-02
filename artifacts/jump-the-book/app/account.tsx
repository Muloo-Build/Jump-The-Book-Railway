import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ClaimOrphanModal from "@/components/ClaimOrphanModal";
import { useColors } from "@/hooks/useColors";
import {
  useDeleteOrphanScenes,
  useIsSignedIn,
  useOrphanScenes,
} from "@/hooks/useRemoteLibrary";

/**
 * Account screen — mobile counterpart to the web's `/account`.
 *
 * Three jobs:
 *   1. Show who's signed in (name + email + sign-out).
 *   2. Recover or forget orphaned scenes — scene groups whose book row
 *      has been deleted. The user picks a group, then either supplies a
 *      title/author to re-attach them, or forgets them outright.
 *   3. Point at Settings for visual/spoiler/reading preference defaults
 *      (which already mirror the web account page on mobile).
 *
 * Anonymous visitors get a soft prompt to sign in — we don't redirect
 * because the user might just be browsing.
 */
export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useAuth();
  const isSignedIn = useIsSignedIn();
  const orphansQ = useOrphanScenes();
  const deleteOrphans = useDeleteOrphanScenes();

  const [claimGroup, setClaimGroup] = useState<{
    userBookId: string;
    sceneCount: number;
  } | null>(null);

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;
  const bottomPad = insets.bottom + 24;

  const greeting =
    user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "Reader";
  const email = user?.primaryEmailAddress?.emailAddress;

  const onSignOut = () => {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const onForget = (group: { userBookId: string; sceneCount: number }) => {
    Alert.alert(
      "Forget these scenes?",
      `This permanently removes ${group.sceneCount} scene${
        group.sceneCount === 1 ? "" : "s"
      }. You can't undo it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forget",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrphans.mutateAsync(group.userBookId);
            } catch (err) {
              Alert.alert(
                "Couldn't remove scenes",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>ACCOUNT</Text>
          <Text style={[styles.h1, { color: colors.foreground }]}>
            Hi, {greeting}
          </Text>
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Manage how you sign in and recover any scenes that lost their home.
          </Text>
        </View>
      </View>

      {/* Identity card */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: colors.accent + "25" }]}>
            <Feather name="user" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.identityName, { color: colors.foreground }]}>
              {greeting}
            </Text>
            {email ? (
              <Text style={[styles.identityEmail, { color: colors.mutedForeground }]}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        {isSignedIn ? (
          <TouchableOpacity
            onPress={onSignOut}
            style={[
              styles.outlineBtn,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            activeOpacity={0.85}
          >
            <Feather name="log-out" size={14} color={colors.foreground} />
            <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>
              Sign out
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/(auth)/sign-in" as never)}
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={14} color="#08081a" />
            <Text style={[styles.primaryBtnText, { color: "#08081a" }]}>
              Sign in
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Orphan recovery */}
      {isSignedIn && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Orphaned scenes
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Scenes whose original book is no longer in your library. Recover
            them by re-entering the title and author, or forget them for good.
          </Text>

          {orphansQ.isLoading && (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Looking for orphan scenes…
              </Text>
            </View>
          )}

          {!orphansQ.isLoading && (orphansQ.data ?? []).length === 0 && (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Feather name="check-circle" size={20} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No orphan scenes — every saved scene is attached to a book.
              </Text>
            </View>
          )}

          {(orphansQ.data ?? []).map((g) => (
            <View
              key={g.userBookId}
              style={[
                styles.orphanCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.orphanCount, { color: colors.foreground }]}>
                  {g.sceneCount} {g.sceneCount === 1 ? "scene" : "scenes"}
                </Text>
                <Text style={[styles.orphanMeta, { color: colors.mutedForeground }]}>
                  Last generated{" "}
                  {new Date(g.latestCreatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.orphanActions}>
                <TouchableOpacity
                  onPress={() =>
                    setClaimGroup({
                      userBookId: g.userBookId,
                      sceneCount: g.sceneCount,
                    })
                  }
                  style={[styles.smallBtn, { backgroundColor: colors.accent }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.smallBtnText, { color: "#08081a" }]}>
                    Recover
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    onForget({
                      userBookId: g.userBookId,
                      sceneCount: g.sceneCount,
                    })
                  }
                  style={[
                    styles.smallBtn,
                    { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.smallBtnText, { color: colors.foreground }]}>
                    Forget
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Pointer to settings for prefs */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/settings" as never)}
          style={[
            styles.linkRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.85}
        >
          <Feather name="sliders" size={16} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: colors.foreground }]}>
              Reading preferences
            </Text>
            <Text style={[styles.linkSub, { color: colors.mutedForeground }]}>
              Default visual style, spoiler protection, reading mode.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ClaimOrphanModal
        visible={!!claimGroup}
        group={claimGroup}
        onClose={() => setClaimGroup(null)}
        onClaimed={(newBookId) => router.push(`/book/${newBookId}`)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    paddingTop: 6,
  },
  h1: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 4, lineHeight: 32 },
  intro: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 6 },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  identityRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  identityName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  identityEmail: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  section: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  orphanCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  orphanCount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  orphanMeta: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  orphanActions: { flexDirection: "row", gap: 6 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  linkSub: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
});
