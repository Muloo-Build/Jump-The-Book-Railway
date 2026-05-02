# Jump the Book — Mobile Design Spec

Drop-in design system for the `jumptheboo_mobile` (Expo / React Native) repo
to make the iOS app look identical to the web app at
`artifacts/jump-the-book-web`.

Everything in this folder is **copy-paste ready** for the mobile repo. The
files use plain React Native (no Tailwind, no NativeWind required) so they
work in any Expo project.

## What's in here

```
mobile-design-spec/
├── README.md                ← this file
├── DESIGN_SPEC.md           ← high-level visual rules (read first)
├── tokens.ts                ← colours, spacing, radii, typography
├── fonts.ts                 ← expo-font loader (Playfair + Plus Jakarta)
├── Logo.tsx                 ← react-native-svg bunny logo
└── components/
    ├── ScreenBackground.tsx ← dark midnight scaffold every screen sits on
    ├── Header.tsx           ← top bar with bunny + screen title
    ├── PrimaryButton.tsx    ← amber pill button ("Add a book")
    ├── GhostButton.tsx      ← outlined dark button ("Upload")
    ├── Card.tsx             ← dark card with subtle border
    ├── BookTile.tsx         ← tall gradient book cover tile
    ├── SceneTile.tsx        ← rectangular gradient scene tile
    ├── SectionHeading.tsx   ← serif "My books" / "Classics" headings
    └── Pill.tsx             ← amber-tinted info pill ("Save your collection")
```

## Quick install in the mobile repo

```bash
# from the root of jumptheboo_mobile
npm i react-native-svg expo-font expo-linear-gradient @expo-google-fonts/playfair-display @expo-google-fonts/plus-jakarta-sans

# copy the files
mkdir -p src/design
cp -r /path/to/this/mobile-design-spec/* ./src/design/
```

Then import tokens and components anywhere:

```tsx
import { colors, type, space, radius } from "@/design/tokens";
import { Logo } from "@/design/Logo";
import { PrimaryButton } from "@/design/components/PrimaryButton";
```

Read `DESIGN_SPEC.md` next for the rules of how these pieces fit together.
