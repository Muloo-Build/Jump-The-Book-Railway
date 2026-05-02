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
- `app/add-book.tsx` — Add a current read
- `app/upload-writing.tsx` — Upload EPUB writing

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
