# Jump the Book — Mobile Design Pack

Drop-in design system for the `jumptheboo_mobile` (Expo / React Native)
repo. Makes the iOS app look like the design canvas (the source files
are included in `source-from-canvas/`).

## Quick install in the mobile repo

```bash
# from the root of jumptheboo_mobile
npx expo install \
  expo-font expo-linear-gradient \
  react-native-svg \
  lucide-react-native \
  @expo-google-fonts/cormorant-garamond \
  @expo-google-fonts/inter \
  @expo-google-fonts/jetbrains-mono

# copy the design folder
mkdir -p src/design
cp -r /path/to/this/mobile-design-spec/* ./src/design/
```

In `App.tsx`:

```tsx
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useBrandFonts } from "@/design/fonts";
import { NavigationContainer } from "@react-navigation/native";
import { navigationTheme } from "@/design/tokens";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const ready = useBrandFonts();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return (
    <NavigationContainer theme={navigationTheme}>
      {/* … your stack here … */}
    </NavigationContainer>
  );
}
```

Then drop a variant straight into a screen:

```tsx
import { MobLibEditorial } from "@/design/variants/MobLibEditorial";
export default function LibraryScreen() {
  return <MobLibEditorial />;
}
```

## What's in here

```
mobile-design-spec/
├── README.md               ← you are here
├── DESIGN_SPEC.md          ← visual rules (read this next)
├── tokens.ts               ← colours, type, spacing, radii, shadows
├── fonts.ts                ← expo-font loader (Cormorant + Inter + JetBrains Mono)
├── Logo.tsx                ← 4 logo marks (Crescent is the default)
│
├── components/
│   ├── MobShell.tsx        ← screen wrapper with header + tab bar
│   ├── ScreenBackground.tsx
│   ├── Header.tsx
│   ├── Wordmark.tsx        ← "Jump the Book" wordmark
│   ├── BottomTabBar.tsx    ← Library / Scenes / Upload / Settings
│   ├── IconButton.tsx
│   ├── Button.tsx          ← primary | ghost | quiet × sm | md | lg
│   ├── Card.tsx
│   ├── SectionHeading.tsx
│   ├── Tag.tsx             ← mono uppercase eyebrow tag
│   ├── Chip.tsx
│   ├── ProgressBar.tsx
│   ├── BookCover.tsx       ← procedural placeholder cover
│   └── SceneArt.tsx        ← procedural placeholder scene art
│
├── variants/               ← drop straight into a screen
│   ├── MobLibEditorial.tsx       (recommended default library)
│   ├── MobLibMinimal.tsx
│   ├── MobLibCinematic.tsx
│   ├── MobLibSceneFirst.tsx
│   ├── MobReadHero.tsx           (recommended default reading mode)
│   └── MobReadFilm.tsx
│
├── source-from-canvas/     ← original .jsx + .css from the design canvas
│   ├── tokens.css
│   ├── primitives.jsx
│   ├── mobile-screens.jsx
│   ├── logos.jsx
│   ├── web-screens.jsx
│   └── ios-frame.jsx
│
└── uploads/                ← exported design canvas screenshots
```

## The most important things to know

1. **Antique brass gold (`#C9A96A`)**, not bright amber. This is a
   common mistake — the gold is dusty and warm, never neon.
2. **Three fonts**: Cormorant Garamond (serif), Inter (sans), and
   **JetBrains Mono for metadata** — the mono uppercase eyebrows are
   the signature look (e.g. `CH. 14 · SCENE 02`).
3. **Gold-tinted borders** — always `rgba(201,169,106,0.10)` or
   `0.22`, never neutral grey.
4. **Pick one library variant + one reading variant** and stick with
   it. Don't ship four versions of the same screen.

Read `DESIGN_SPEC.md` next.
