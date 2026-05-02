import { useSignUp } from "@clerk/expo";
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

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const isBusy = fetchStatus === "fetching";
  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      console.warn("Sign-up error:", error);
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          router.replace(url as Href);
        },
      });
    }
  };

  if (needsVerification) {
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
              Check your email
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We sent a 6-digit code to {emailAddress}. Enter it below to finish
              creating your account.
            </Text>

            <Text style={[styles.label, { color: colors.foreground }]}>
              Verification code
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderColor: colors.border,
                  letterSpacing: 6,
                  fontSize: 20,
                  textAlign: "center",
                },
              ]}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />
            {errors.fields.code && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {errors.fields.code.message}
              </Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  opacity: code.length < 6 || isBusy ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
              disabled={code.length < 6 || isBusy}
              onPress={handleVerify}
            >
              <Text
                style={[styles.primaryButtonText, { color: colors.primaryForeground }]}
              >
                {isBusy ? "Verifying…" : "Verify"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => signUp.verifications.sendEmailCode()}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                Send a new code
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
            Build your shelf
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Every book you're reading — in one place, on every device.
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
          {errors.fields.emailAddress && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errors.fields.emailAddress.message}
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
            placeholder="At least 8 characters"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoComplete="password-new"
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
              {isBusy ? "Creating account…" : "Create account"}
            </Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Text style={{ color: colors.mutedForeground }}>
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in" replace>
              <Text style={[styles.link, { color: colors.primary }]}>
                Sign in
              </Text>
            </Link>
          </View>

          {/* Required by Clerk's bot-protection on sign-up. */}
          <View nativeID="clerk-captcha" />
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
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
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
