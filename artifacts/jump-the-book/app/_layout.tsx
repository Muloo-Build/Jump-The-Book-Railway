import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  setAuthTokenGetter,
  setBaseUrl,
} from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LibraryProvider } from "@/context/LibraryContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Configure the generated API client to talk to the deployed API server.
const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
if (apiDomain) {
  setBaseUrl(`https://${apiDomain}`);
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

if (!publishableKey) {
  // Surface a clear error rather than letting Clerk crash deep in render.
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set CLERK_PUBLISHABLE_KEY in the project secrets.",
  );
}

/**
 * Bounces unauthenticated users to the (auth) group and signed-in users
 * out of it. Mirrors the canonical Expo Router + Clerk gate pattern.
 *
 * Also wires the bearer-token getter so every API request from the
 * generated client carries the user's session token. To avoid a first-
 * render race where protected screens could mount and fire `/api/me/*`
 * queries *before* the token getter is installed (or before the auth
 * redirect runs), we deliberately render `null` until BOTH:
 *   1. Clerk has finished loading (`isLoaded`)
 *   2. The token getter has been installed for the current session
 *   3. The route matches the auth state (signed-in users not in (auth),
 *      signed-out users in (auth))
 * Only then do we mount the rest of the tree, guaranteeing that any
 * child useQuery / useEffect that fires an authed request sees a real
 * `getToken` and the correct route.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [tokenGetterReady, setTokenGetterReady] = React.useState(false);

  React.useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setTokenGetterReady(true);
    return () => {
      setAuthTokenGetter(null);
      setTokenGetterReady(false);
    };
  }, [getToken]);

  const inAuthGroup = segments[0] === "(auth)";

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, inAuthGroup, router]);

  // Hold the rest of the tree until Clerk is ready, the bearer-token
  // getter is installed, and the current route matches the auth state.
  if (!isLoaded || !tokenGetterReady) return null;
  if (!isSignedIn && !inAuthGroup) return null;
  if (isSignedIn && inAuthGroup) return null;

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="experience/[id]"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen name="upload" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey!}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <LibraryProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AuthGate>
                      <RootLayoutNav />
                    </AuthGate>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </LibraryProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
