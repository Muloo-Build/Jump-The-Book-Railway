import { useSignIn } from "@clerk/expo";
import { Link, type Href, useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const isBusy = fetchStatus === "fetching";

  const handleSubmit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      console.warn("Sign-in error:", error);
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          router.replace(url as Href);
        },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.brandMark, { color: colors.primary }]}>
            Jump the Book
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to your shelf and pick up where you left off.
          </Text>

          <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={emailAddress}
            onChangeText={setEmailAddress}
          />
          {errors.fields.identifier && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.fields.identifier.message}
            </Text>
          )}

          <Text style={[styles.label, { color: colors.foreground }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          {errors.fields.password && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.fields.password.message}
            </Text>
          )}

          {errors.global?.[0]?.message && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.global[0].message}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: !emailAddress || !password || isBusy ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
            disabled={!emailAddress || !password || isBusy}
            onPress={handleSubmit}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              {isBusy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Text style={{ color: colors.mutedForeground }}>
              New to Jump the Book?{" "}
            </Text>
            <Link href="/(auth)/sign-up" replace>
              <Text style={[styles.link, { color: colors.primary }]}>
                Create an account
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    justifyContent: "center",
  },
  brandMark: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },
  link: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
