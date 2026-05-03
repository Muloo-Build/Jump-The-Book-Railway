# Jump the Book — Mobile Visual Design Spec

The mobile app must feel like a quiet cinema lobby in an old library:
deepest near-black with a warm violet undertone, a single antique-brass
gold accent, an editorial serif paired with a clean sans, and a mono
typeface used like a typesetter's note for metadata.

This spec is the source of truth for the iOS/React-Native app. It mirrors
the design canvas exported as `source-from-canvas/`. If anything here
is ambiguous, the canvas files (especially `tokens.css`,
`primitives.jsx`, `mobile-screens.jsx`, and `logos.jsx`) win.

---

## 1. Mood

- **Dark mode only.** No light mode on mobile.
- Every screen sits on `#08080B` — almost black, with a hint of warm
  violet so it never reads cold or clinical.
- One accent colour: **antique-brass gold** (`#C9A96A`). Not the bright
  amber of the prior draft. Soft, dusty, "found in a book" gold.
- Borders are tinted with the gold (10–22% alpha). They never use a
  neutral grey — that's what makes the dark feel warm.
- Three type families: serif (Cormorant Garamond) for display,
  sans (Inter) for UI, mono (JetBrains Mono) for metadata.
- Generous breathing room. Tap targets ≥ 38pt. Padding is 16pt or 20pt.
- Mono uppercase eyebrows are the **signature touch** — short captions
  like `◐ TUESDAY EVENING`, `CONTINUE · 62%`, `CH. 14 · SCENE 02`.

## 2. Colour palette

Direct port of `source-from-canvas/tokens.css`.

### Ink ramp (cool dark neutrals)
| Token  | Hex       | Usage                              |
| ------ | --------- | ---------------------------------- |
| ink900 | `#08080B` | Page background                    |
| ink800 | `#0F1015` | Card background                    |
| ink700 | `#16171E` | Elevated card / popover            |
| ink600 | `#1E1F28` | Hover / pressed                    |
| ink500 | `#2A2B36` | Strong divider                     |
| ink400 | `#3A3B47` | Divider                            |
| ink300 | `#5A5B68` | Muted text                         |
| ink200 | `#8A8B97` | Secondary text                     |
| ink100 | `#C7C8D1` | Cool primary text (rarely used)    |

### Paper (warm body text)
| Token   | Hex       | Usage                                  |
| ------- | --------- | -------------------------------------- |
| paper   | `#EDE6D3` | All body text, headings on dark        |
| paper2  | `#F5EFDF` | Brightest text (rarely used)           |

### Gold ramp (the accent system)
| Token   | Hex       | Usage                                  |
| ------- | --------- | -------------------------------------- |
| gold50  | `#FBF3DC` | —                                      |
| gold100 | `#F2E1B0` | —                                      |
| gold200 | `#E6C885` | Highlight; italic emphasis text        |
| gold300 | `#D4B26B` | —                                      |
| gold400 | `#C9A96A` | **Primary accent** — buttons, eyebrows |
| gold500 | `#B0904D` | —                                      |
| gold600 | `#8E7339` | —                                      |
| gold700 | `#6B552A` | accent-lo, dim accent edges            |
| gold800 | `#463818` | —                                      |

### Semantic aliases
| Alias          | Value                                | Usage                      |
| -------------- | ------------------------------------ | -------------------------- |
| bg             | `ink900`                             | Screen background          |
| bgCard         | `ink800`                             | Cards, sheets              |
| bgRaise        | `ink700`                             | Hover/popover              |
| border         | `rgba(201,169,106,0.10)`             | All hairlines              |
| borderStrong   | `rgba(201,169,106,0.22)`             | Hero borders, button outlines |
| text           | `paper` (`#EDE6D3`)                  | Body text                  |
| textDim        | `#9D958A`                            | Secondary text             |
| textMute       | `#6B6258`                            | Captions, placeholders     |
| accent         | `gold400`                            | Primary CTA, accents       |
| accentHi       | `gold200`                            | Italic emphasis, highlights |
| accentLo       | `gold700`                            | Faded accent edges         |
| onAccent       | `#1A1208`                            | Text on top of gold buttons |

## 3. Typography

Three families — install via `@expo-google-fonts`:

- **Serif**: Cormorant Garamond (400 / 500 / 500-italic / 600)
- **Sans**: Inter (400 / 500 / 600)
- **Mono**: JetBrains Mono (400 / 500)

| Role               | Font             | Wt   | Size | Line | LS    | Color    |
| ------------------ | ---------------- | ---- | ---- | ---- | ----- | -------- |
| Hero               | Cormorant 500    | 500  | 32   | 34   | -0.5  | text     |
| Hero italic accent | Cormorant 500i   | 500i | 32   | 34   | -0.5  | accentHi |
| Section heading    | Cormorant 500    | 500  | 18   | 22   | -0.2  | text     |
| Pull-quote         | Cormorant 500i   | 500i | 18   | 24   | 0     | white    |
| Reader body        | Cormorant 400    | 400  | 17   | 28   | 0     | text     |
| UI body            | Inter 400        | 400  | 13   | 19   | 0     | text     |
| Body strong        | Inter 600        | 600  | 13   | 19   | 0     | text     |
| Caption            | Inter 400        | 400  | 12   | 17   | 0     | textMute |
| Button label       | Inter 600        | 600  | 13   | 13   | 0.1   | onAccent |
| **Eyebrow** ⭐     | JetBrains Mono   | 400  | 9.5  | 12   | 1.5   | accent (UPPERCASE) |
| Meta number        | JetBrains Mono   | 400  | 10   | 12   | 1     | textMute |
| Tab label          | Inter 500        | 500  | 9    | 11   | 0.3   | accent / textMute |

⭐ The mono uppercase eyebrow is the most distinctive type pattern —
use it everywhere a small caption or status would otherwise sit.

## 4. Spacing & shape

- **Spacing scale**: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 (pt). Use 20 as
  the default screen-edge padding.
- **Radius**: sm = 6, md = 10, lg = 14, xl = 22, pill = 999.
- **Hairlines**: always `StyleSheet.hairlineWidth` with the gold-tinted
  border — never solid grey.

## 5. Shadows

The dark theme uses shadows sparingly, but they are present:

```ts
// Card                shadowColor: #000, opacity 0.50, radius 30, y +8
// Raised (book cover) shadowColor: #000, opacity 0.60, radius 40, y +14
// Gold glow (CTA)     shadowColor: gold, opacity 0.25, radius 20, y +6
```

Buttons in the primary variant additionally have a 1px white inset
highlight along the top edge (recreated in `Button.tsx` with an
overlay `View`).

## 6. Logos

Four marks live in `Logo.tsx`:
1. **Crescent** — moon with a rabbit silhouette in negative space. **The featured mark; use this everywhere by default.**
2. **Compass** — rabbit ears as compass needle.
3. **Jump** — geometric rabbit head, pure silhouette.
4. **Portal** — open book whose pages frame a rabbit.

The wordmark `Wordmark.tsx` reads "*Jump* the Book" with `Jump` in
italic gold, `the` in faded paper, `Book` plain. Always pair: the
Crescent mark (22pt) + the wordmark (14pt) for the screen header.

## 7. Components

All in `components/`:

- **MobShell** — wraps every screen. Provides header (or minimal
  header/back chevron), body slot, and bottom tab bar.
- **Header** — Crescent + wordmark left, optional icon buttons right.
- **BottomTabBar** — Library / Scenes / Upload / Settings, with a
  lucide icon + tiny mono-style label per tab.
- **IconButton** — 32×32 hit target. `dark` variant for use over scene
  imagery (translucent backdrop + 1px white-10 border).
- **Button** — three variants (primary / ghost / quiet) and three sizes
  (sm / md / lg). Primary has the inset highlight + gold glow.
- **Card** — dark surface with gold-tinted border + `shadows.card`.
- **SectionHeading** — serif title left, mono number/CTA right.
- **Tag** — mono uppercase pill with gold-tinted background and border.
- **Chip** — filter chip used in the scene-first grid.
- **ProgressBar** — thin gold-gradient bar.
- **BookCover** — procedural deterministic gradient cover with serif
  title stamp. Drop in until real artwork is wired up.
- **SceneArt** — procedural placeholder for AI-generated scene images.
  Three styles: `"cinematic"` (default), `"comic"`, `"watercolour"`.
  Same seed always renders the same composition.

## 8. Library variants — pick one

The canvas explores **four** library home layouts. Each lives in
`variants/MobLib*.tsx` ready to drop in.

| Variant      | Voice          | Best when…                                      |
| ------------ | -------------- | ----------------------------------------------- |
| Editorial    | Magazine       | You want the brand & a single hero scene to lead. **Recommended default.** |
| Minimal      | Quiet list     | Power readers with many books — text-forward.   |
| Cinematic    | Streaming app  | Scenes are the product; full-bleed swipeable hero. |
| Scene-first  | Pinterest-y    | You want to surface every scene immediately.    |

## 9. Reading variants — pick one

| Variant      | What it does                                           |
| ------------ | ------------------------------------------------------ |
| Hero         | Scene image up top, text scrolls under, floating control puck. **Most cinematic.** |
| Filmstrip    | Vertical thumbnail rail of scenes alongside text.      |
| Split        | Text fills the screen; scene strip peeks from the bottom (paste from canvas). |
| Inline       | Scenes interleaved with text like a magazine spread (paste from canvas). |

The first two are pre-built in `variants/`. Split + Inline are
documented in `source-from-canvas/mobile-screens.jsx` and easy to port
using the same primitives.

## 10. Iconography

Use **lucide-react-native** — same icon set as the web. Standard
stroke width = 1.4. Default color = `colors.text`. Common icons:
`Search`, `Plus`, `Book`, `Sparkles`, `Play`, `Pause`, `Heart`,
`Settings`, `ChevronLeft`, `ChevronRight`, `Eye`, `Moon`, `Film`.

## 11. Motion

- Tile / button press: scale to 0.97 over 100ms.
- Screen transitions: native stack default (right slide for forward).
- Cinematic playback: cross-fade scene 800ms ease-out, then 8s slow Ken
  Burns zoom (`scale 1.0 → 1.08`) on the image.
- Pull-quote / caption: fade-in 600ms with 500ms delay after scene swap.

## 12. What NOT to do

- **No bright amber.** The prior draft used `#fbbf24` — wrong. Always
  the antique brass `#C9A96A`.
- **No system fonts.** Always Cormorant + Inter + JetBrains Mono.
- **No neutral grey borders.** Always the gold-tinted alpha border.
- **No second accent colour.** Gold is the only chromatic accent.
- **No shadows on flat dark cards.** Use `shadows.card` only on cards
  that need to feel raised; otherwise let the gold border do the work.
- **No `Welcome to Jump the Book` style hero.** The tone is editorial
  not transactional — `The next scene awaits.` is the voice.
- **No bunny logo on a white background.** Always on `bg` or `bgCard`.

---

## Source-of-truth files

- `source-from-canvas/tokens.css` — the original tokens
- `source-from-canvas/primitives.jsx` — Btn / Chip / Tag / SceneArt / BookCover / Icon
- `source-from-canvas/mobile-screens.jsx` — all 8 mobile screen variants
- `source-from-canvas/logos.jsx` — the 4 logo marks + wordmark + lockup
- `source-from-canvas/web-screens.jsx` — the web design (for parity)
- `uploads/` — exported renders showing the intended look
