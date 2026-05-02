# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations proxy (no user API key needed)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### `artifacts/api-server` — Express API server
- Routes: `/api/healthz`, `/api/scenes/generate`, `/api/scenes/image`
- AI: uses `@workspace/integrations-openai-ai-server` (gpt-5.4 + gpt-image-1)
- Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-provisioned)

### `artifacts/jump-the-book` — Expo mobile app (React Native / web)
Jump the Book — AI-powered visual reading companion.

**5-tab navigation**: Home, Library, Immersion, Characters, Settings

**Key screens**:
- `app/(tabs)/index.tsx` — Home with streak badge, demo library carousel, how-it-works
- `app/book/[id].tsx` — Book detail with position entry, quick actions, chapter list
- `app/chapter/[id].tsx` — Chapter with Scenes/Characters/Ambient tabs, progressive unlock, AI Generate
- `app/ambient-companion.tsx` — Full-screen ambient companion mode (gradient + scene cycling)
- `app/immersion-mode.tsx` — Full-screen immersion mode
- `app/upload.tsx` — **Unified "Upload or Add" flow** (replaces add-book + upload-writing): drag-or-tap EPUB picker (web HTML input + native expo-document-picker), cross-platform JSZip parser, auto-fills title/author/chapter count, auto-kicks-off scene generation for chapter 1 after add. Falls back to manual entry. Inline validation for title/author/chapter/page (positive integers); submit wrapped in try/catch/finally with surfaced `errors.submit`. After `addBook` returns the new id, calls `updatePosition` so the book detail screen immediately reflects the entered chapter/page.
- `app/book/[id].tsx` — Resolves books from BOTH `DEMO_BOOKS` and `userLibrary` via a `NormalizedBook` adapter. User books with no pre-baked chapters render a "Scenes are being prepared" empty state, hide Ambient/Immersion/Characters quick actions, and disable the primary button with "Scenes coming soon". The "Public Domain" gold badge only renders for demo books.
- `LibraryContext.addBook` returns the new book id (`Promise<string>`) so callers can immediately reference the created book (e.g. to seed positions).
- `app/add-book.tsx`, `app/upload-writing.tsx` — Legacy routes (kept for back-compat, no longer linked from library)

**Key components**:
- `components/AmbientCompanion.tsx` — Swipeable scene player, soundscape labels, auto-hide UI
- `components/ContextualCharacters.tsx` — Character cards filtered to current scene, relationship web
- `components/PositionEntry.tsx` — Smart position picker (chapter/page or HH:MM:SS timestamp)
- `components/SceneCard.tsx` — Scene card with AI image support (base64) and gradient fallback
- `components/SessionRecap.tsx` — End-of-session modal with stats and streak
- `components/StreakBadge.tsx` — Streak display (compact and full variants)

**Key context / hooks**:
- `context/LibraryContext.tsx` — Global state: library, positions, reading sessions, streak
- `hooks/useGenerateScene.ts` — Calls `/api/scenes/generate`, caches in AsyncStorage (24h TTL)
- `hooks/useColors.ts` — Design token hook (single dark palette)

**Design tokens** (cinematic dark theme):
- Background: `#08081a`
- Gold/primary: `#c9974a`
- Accent/purple: `#9d7fe8`
- Card: `#12122a`

**AI features**:
- Scene generation: GPT-5.4 with strict spoiler-safe system prompt → 3-5 scene cards per chapter
- Scene image: gpt-image-1 at 1024×1024 → base64 returned and rendered inline
- 6 visual styles: comic-book, watercolour, dark-cinematic, animated-storybook, manga-inspired, fantasy-illustration
- Progressive unlock: scenes filtered by user's saved chapter/page/timestamp position
- Reading sessions: start/end tracked, streak computed from consecutive reading days
- EPUB upload: JSZip parses .epub on web, extracts text + OPF metadata
