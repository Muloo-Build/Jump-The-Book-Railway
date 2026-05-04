// Jump the Book — font loader
// Loads the three brand families before first render.
//
// Required deps in mobile repo:
//   npx expo install expo-font \
//     @expo-google-fonts/cormorant-garamond \
//     @expo-google-fonts/inter \
//     @expo-google-fonts/jetbrains-mono

import { useFonts } from "expo-font";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";

export function useBrandFonts(): boolean {
  const [loaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });
  return loaded;
}

// Usage in App.tsx:
//
//   import * as SplashScreen from "expo-splash-screen";
//   import { useBrandFonts } from "@/design/fonts";
//   SplashScreen.preventAutoHideAsync();
//
//   export default function App() {
//     const ready = useBrandFonts();
//     useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
//     if (!ready) return null;
//     return <RootNavigator />;
//   }
