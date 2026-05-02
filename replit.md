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
- Routes: `/api/healthz`, `/api/scenes/generate`, `/api/scenes/image`, `/api/scenes/cache/stats`, `/api/storage/objects/:namespace/:id`, `/api/storage/public-objects/*`
- AI: uses `@workspace/integrations-openai-ai-server` (gpt-5.4 + gpt-image-1)
- Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-provisioned), `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
- **Storage model**: scene PNGs are uploaded to App Storage under `${PRIVATE_OBJECT_DIR}/scene-images/<uuid>` and stored in `image_cache.object_path` as `/objects/scene-images/<uuid>`. The web client receives `imageUrl = /api/storage/objects/scene-images/<uuid>`. The storage GET route only serves an allow-list of namespaces (currently `scene-images`); other private objects are 404. Legacy base64 column (`image_b64`) is nullable for backward compat.

### `artifacts/jump-the-book-web` — React + Vite web app (primary)
Jump the Book — web reading companion. Reader uploads an EPUB (parsed entirely in-browser via JSZip) or picks a public-domain demo book, gets spoiler-safe AI scenes for the chapter they're on, and views them as Comic (stacked panels) or Cinematic (full-screen with narration).

**Stack**: React 19, Vite, TypeScript, Tailwind v4, shadcn/ui (Radix), wouter, framer-motion, TanStack Query.

**Routes**: `/` Home, `/library`, `/upload`, `/generate`, `/book/:id`, `/position/:id`, `/experience/:id` (Cinematic), `/comic/:id`, `/help`.

**Data layer**:
- `src/data/books.ts` — demo book catalog (Alice, Dracula, Frankenstein, Sherlock) + chapters, characters, scenes; `SCENE_IMAGES` points to static `/scenes/<id>.png` files in `public/scenes/`.
- `src/lib/library.ts` — `useLibrary()` hook, localStorage-backed user library, positions, reading sessions, streak. No backend calls.
- `src/lib/epub.ts` — `parseEpubFromArrayBuffer()` browser-side EPUB parser.
- `src/hooks/useGenerateScene.ts` — calls `/api/scenes/generate` then `/api/scenes/image` with bounded concurrency, exposes `onScenesReady` / `onImageReady` callbacks. Consumes `imageUrl` (URL string) — never base64.

**Theme**: dark cinematic — Playfair Display (serif) + Plus Jakarta Sans, deep plums/oxbloods/dusty golds/midnight blues. Palette in `src/index.css` `:root` and `.dark` blocks (HSL tokens compatible with shadcn/ui).

### `artifacts/jump-the-book` — Expo mobile app (legacy, route `/mobile`)
Jump the Book — AI-powered visual reading companion. Drop an EPUB → choose Comic or Cinematic → watch the chapter as AI-generated panels.

**5-tab navigation**: Home, Library, Immersion, Characters, Settings

**Core flow**:
1. `app/upload.tsx` — Drop an EPUB → "We found 'X' by Y, N chapters" → pick Comic or Cinematic → progress bar ("Painting scene 2 of 4…") → push to `/experience/[id]`. Optional "Pick up at chapter X" toggle (off by default). One-line "Just enter a title & author" fallback. Tiny "Why no Kindle?" link with explanatory modal.
2. `app/experience/[id].tsx` — Unified Comic + Cinematic player. `?mode=comic|cinematic` query, top toggle to flip mid-session.
   - **Comic**: vertical scroll of full-bleed panels with narration below each.
   - **Cinematic**: full-screen, swipe sideways, narration overlay.
   - For demo books: pulls from `SCENE_IMAGES` (pre-baked AI art).
   - For user books: calls `generateScenesWithImages` with live progress.
3. `app/book/[id].tsx` — Two big tiles "Comic" and "Cinematic" → `/experience/[id]?mode=...`. Optional "Pick up at chapter X" chip (no position-gating). For user books with no scenes yet, both tiles show "Generate scenes".

**Pre-baked demo art**:
- `assets/images/scenes/<sceneId>.png` — 15 real AI-generated panels covering chapter 1 of all 4 demo books (Alice 6 scenes, Dracula 3, Frankenstein 3, Sherlock 3). Each is 1024×1024 PNG (1.2-2.5 MB).
- `data/books.ts` exports `SCENE_IMAGES: Record<string, number>` mapping scene id → require()'d asset.
- Regenerate via `node scripts/src/bake-demo-images.mjs` (sequential, ~33s/image, ~10 min total). Calls `/api/scenes/image` through `localhost:80`. Run as a workflow to survive bash sandboxing.

**Key components**:
- `components/BookCard.tsx`, `CharacterCard.tsx`, `StreakBadge.tsx`, `Badge.tsx`, `StyleSelector.tsx`, `ErrorBoundary.tsx`, `ErrorFallback.tsx`, `KeyboardAwareScrollViewCompat.tsx`

**Key context / hooks**:
- `context/LibraryContext.tsx` — Global state: library, positions, reading sessions, streak. `addBook` returns `Promise<string>` (the new id).
- `hooks/useGenerateScene.ts` — `generateScenesWithImages(book, chapter, opts, onProgress)` returns `{ scenes }` with inline base64 images and a SceneProgress callback ("text" → "image i/n" → "done"). 7-day AsyncStorage cache via `readCachedScenes`/`writeCachedScenes`.
- `hooks/useColors.ts` — Design token hook (single dark palette).

**Design tokens** (cinematic dark theme):
- Background: `#08081a`, Card: `#12122a`, Gold/primary: `#c9974a`, Accent/purple: `#9d7fe8`

**Honesty about external services**:
- No fake Kindle/Audible "connect" buttons. Removed from library, settings, home.
- Single "Why no Kindle?" link in upload screen with a modal explaining DRM.
- Position tracking is optional ("Pick up at chapter X"), never gates content.

**AI backend** (`/api/scenes/*`):
- `POST /api/scenes/generate` → GPT-5.4 with spoiler-safe prompt → `{ scenes: [...] }`
- `POST /api/scenes/image` → gpt-image-1 at 1024×1024 → `{ b64 }`
