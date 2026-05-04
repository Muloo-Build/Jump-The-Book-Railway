# Jump the Book — Mobile Handoff Bundle

Drop this folder into the mobile Expo project. Below is what's inside and where each piece should go.

## Contents

```
mobile-handoff/
├── README.md           ← Full handoff doc (the long reference — read this first)
├── SETUP.md            ← This file
├── design/             ← Mobile design spec: tokens, fonts, components, screen variants
├── types/              ← Shared TypeScript types + Open Library helpers
└── assets/avatars/     ← 10 bunny avatar SVGs (matches the web app exactly)
```

## Where to put each piece in the mobile project

| Bundle folder | Mobile project path |
|---------------|---------------------|
| `design/` | `src/design/` |
| `types/api.ts` | `src/types/api.ts` |
| `types/openLibrary.ts` | `src/lib/openLibrary.ts` |
| `assets/avatars/*.svg` | `src/assets/avatars/` (or `assets/avatars/` for Expo) |
| `README.md` | `MOBILE_HANDOFF.md` at the project root |

## What you still need to provide as environment variables

The bundle does NOT contain secrets. Set these in the mobile Replit project's Secrets:

1. **`CLERK_PUBLISHABLE_KEY`** — the same key the web app uses (find it in this web project's Secrets)
2. **`API_BASE_URL`** — the deployed URL of the web app's API server, ending in `/api`
   - Dev: `https://<this-project's-replit-dev-domain>/api`
   - Production: `https://<deployed-domain>/api`

## Suggested first steps for the mobile agent

1. Read `README.md` (the full handoff) cover to cover
2. Read `design/DESIGN_SPEC.md` for the visual rules
3. Install the fonts and packages listed in Section 18 of the README
4. Copy `design/tokens.ts`, `design/fonts.ts`, `design/Logo.tsx` into the project
5. Copy the components in `design/components/` — these are drop-in ready
6. Use one of the variants in `design/variants/` as a starting point for the Library and Reading screens
7. Wire up Clerk auth using `@clerk/expo` with the same publishable key
8. Set up an `apiFetch()` helper using the `API_BASE_URL` env var (sample code in Section 18)
9. Implement screens in this order: Library → Book Detail → Scene Generation → Cinematic View → Account → Discover

## Keeping in sync with the web app

This bundle is a **snapshot**. When the web app changes (new API endpoints, new fields, new design tokens), regenerate this bundle from the source repo and re-copy the relevant files into the mobile project.

The files most likely to change:
- `README.md` (the handoff doc) — whenever a new feature ships
- `types/api.ts` — whenever the API contract changes
- `design/tokens.ts` — only if the visual identity is updated (rare)
