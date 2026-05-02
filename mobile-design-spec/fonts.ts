// Jump the Book — font loader
// Add this to your root component (App.tsx) so the brand fonts load before
// the first render. Returns `true` once fonts are ready.
//
// Required dependencies (run in mobile repo):
//   npx expo install expo-font @expo-google-fonts/playfair-display @expo-google-fonts/plus-jakarta-sans

import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from "@expo-google-fonts/plus-jakarta-sans";

export function useBrandFonts(): boolean {
  const [loaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });
  return loaded;
}

// Usage in App.tsx:
//
//   import { useBrandFonts } from "@/design/fonts";
//   import * as SplashScreen from "expo-splash-screen";
//   SplashScreen.preventAutoHideAsync();
//
//   export default function App() {
//     const fontsReady = useBrandFonts();
//     useEffect(() => { if (fontsReady) SplashScreen.hideAsync(); }, [fontsReady]);
//     if (!fontsReady) return null;
//     return <RootNavigator />;
//   }
