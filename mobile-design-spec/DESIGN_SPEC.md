# Jump the Book — Visual Design Spec

The mobile app must feel like a quiet cinema lobby: deep midnight background,
a single warm amber accent, and serif typography that signals "this is for
readers". Below is the rule book.

---

## 1. Mood

- Dark mode only. There is no light mode.
- Every screen sits on the same near-black plum background — never pure black.
- Generous breathing room. Tap targets are 44pt+. Padding is 16pt or 24pt.
- Two type families: **Playfair Display** (serif, used for hero text + section
  titles) and **Plus Jakarta Sans** (sans, used for everything else).
- One accent colour: **amber gold**. Used sparingly — primary CTA, key brand
  word "*the*" in the wordmark, focus rings, the bunny logo.

## 2. Colour palette (from web's `index.css` `.dark` theme)

| Token              | Hex       | Usage                                   |
| ------------------ | --------- | --------------------------------------- |
| `bg`               | `#0a0810` | Screen background                       |
| `bgElevated`       | `#0e0c14` | Cards, sheets                           |
| `bgSubtle`         | `#16131e` | Hover/pressed states, scene tiles base  |
| `border`           | `#211e2b` | All hairlines                           |
| `borderStrong`     | `#2c2839` | Focused / pressed border                |
| `text`             | `#ece4d4` | Body text                               |
| `textMuted`        | `#7d7488` | Secondary text, captions                |
| `textFaint`        | `#4d4658` | Disabled, placeholder                   |
| `gold`             | `#fbbf24` | Primary CTA bg, emphasis                |
| `goldOnBg`         | `#000000` | Text on gold buttons                    |
| `goldSoft`         | `#fde68a` | Italic emphasis ("*the*"), accents      |
| `goldRing`         | `#b58a3d` | Focus ring, brand secondary             |
| `dangerBg`         | `#7a2222` | Destructive button bg                   |
| `dangerText`       | `#ffeded` | Text on dangerBg                        |

## 3. Typography

| Role                | Font                | Weight | Size | Line  |
| ------------------- | ------------------- | ------ | ---- | ----- |
| Hero (page title)   | Playfair Display    | 700    | 36   | 1.1   |
| Hero italic accent  | Playfair Display    | 700i   | 36   | 1.1   |
| Section heading     | Playfair Display    | 700    | 22   | 1.2   |
| Body                | Plus Jakarta Sans   | 400    | 15   | 1.5   |
| Body strong         | Plus Jakarta Sans   | 600    | 15   | 1.5   |
| Caption / Meta      | Plus Jakarta Sans   | 500    | 12   | 1.3   |
| Eyebrow (uppercase) | Plus Jakarta Sans   | 600    | 11   | 1.2   |
| Button label        | Plus Jakarta Sans   | 600    | 14   | 1.0   |

Eyebrows use uppercase + `letter-spacing: 1.2` and the gold colour.

## 4. Spacing & shape

- **Spacing scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 (pt)
- **Radius**: small=6, default=10, card=14, pill=999
- **Gap between tiles**: 12pt
- **Screen horizontal padding**: 20pt

## 5. Components & their web counterparts

### Header
Sticky, 56pt tall, has bunny logo (28pt) on the left, the wordmark text
"Jump *the* Book" beside it (Playfair, italic on "*the*", gold), tabs in the
middle on tablet, account avatar on the right. On phone, tabs are in a bottom
tab bar instead and the header just shows logo + screen title.

### Hero block (Library home)
- Eyebrow row: amber dot + "SATURDAY · 11:54 PM" (uppercase, gold, 11pt).
- Title: "Welcome to *Jump the Book*." — Playfair 700, 36pt. The phrase
  "*Jump the Book*" is italic + soft gold (`goldSoft`).
- Subtitle: "Your shelf is waiting…" — sans 15pt `textMuted`.
- Right side has two buttons stacked on phone: ghost "Upload", filled
  amber "Add a book".

### Save-your-collection pill banner
A single 14-radius card with `bg=#1a1306`, gold border at 30% opacity, gold
sparkle icon, the line "Save your collection", and two buttons (gold
"Get started" + ghost "Sign in"). Only shown when signed-out.

### Section heading
Serif 22pt + a thin 1pt border bottom across the row. To the right, a small
"Browse all →" link in muted sans 13pt.

### My books grid
2-column grid on phone. Each tile is a `BookTile`:
- Aspect ratio 2:3.
- Linear gradient background derived from the book's `coverGradient`.
- Title in Playfair 18pt at the bottom-left, author in sans 12pt muted below.
- 14pt radius, no shadow (just a faint border).

### Scene library row
Horizontally scrolling row of 16:9 scene tiles. Each `SceneTile` has the
scene gradient as background, a black 40% gradient overlay at the bottom,
and a 13pt sans white title + 11pt muted location.

### Empty state
Centered, dashed border 1pt, radius 14pt, two buttons (gold + ghost).
Copy: "Your library is empty."

### Cinematic playback (full-screen)
- Status bar hidden.
- Black background, scene image fills the screen at 60% opacity.
- Bottom 40% has the gradient overlay (black → transparent).
- Italic Playfair narration centered, 22pt, max-width 80% of screen.
- Bottom safe-area: progress dots row + amber circular play button.

## 6. Iconography

Use **lucide-react-native** — the web app uses lucide; importing the same
names keeps icon parity. Common ones: `Search`, `Upload`, `LogOut`,
`Settings`, `Play`, `Pause`, `SkipForward`, `SkipBack`, `Volume2`, `VolumeX`,
`ChevronLeft`, `ChevronRight`, `X`, `Sparkles`.

Icon stroke width = 1.75. Default colour = current text colour.

## 7. Motion

- Tile press: scale to 0.97 over 100ms, ease-out.
- Screen transitions: native stack default (right slide for forward).
- Cinematic playback: scene cross-fade 800ms ease-out, then 8s slow zoom
  (Ken Burns) on the image — `scale: 1.0 → 1.08`.
- Caption fade-in 600ms with 500ms delay after scene swap.

## 8. What NOT to do

- Don't use pure white. Body text is `#ece4d4`, not `#ffffff`.
- Don't use shadows on cards. The dark theme uses borders, not elevation.
- Don't introduce a second accent colour. Gold is the only chromatic accent.
- Don't use system fonts. Always Playfair + Plus Jakarta.
- Don't use rounded-pill for cards — only for buttons + badges.
- Don't put the bunny logo on a white background. Always on `bg` or `bgElevated`.

---

If anything in here is ambiguous, the source of truth is
`artifacts/jump-the-book-web/src/index.css` (`.dark` block) and
`artifacts/jump-the-book-web/src/components/layout.tsx` in the web repo.
