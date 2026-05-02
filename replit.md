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
- Routes: `/api/healthz`, `/api/scenes/generate`, `/api/scenes/image`, `/api/scenes/cache/stats`, `/api/storage/objects/:namespace/:id`, `/api/storage/public-objects/*`, `/api/me/*` (authed user library), `/api/books/context/search` (public — bible draft generator), `/api/me/books/:bookId/bible` (authed bible CRUD), `/api/me/bibles/summaries` (authed — bulk per-bible counts for badging library tiles), `/api/__clerk/*` (Clerk Frontend API proxy, prod only)
- `POST /api/scenes/generate` accepts an optional `bookBibleId`. The endpoint is public, so when `bookBibleId` is provided the server reads `getAuth(req)?.userId` and only loads the bible when both the requester is signed in **and** `book_bibles.userId === requesterId`. Mismatch / no-auth → log + drop the bible context (fail-soft, never 401 the scene call).
- **Book dedup** (`/api/me/books`): `POST` trims `title`/`author` and rejects empties; before inserting, it looks up an existing row — by `(userId, demoBookId)` for `source: "demo"` and by `(userId, lower(trim(title)), lower(trim(author)))` for `source: "upload"|"manual"` — and returns the existing book (with non-empty fields like cover/format/totalChapters patched in) instead of creating a duplicate. `GET` runs a server-side `dedupeAndMergeBooks` pass that groups historical duplicate rows by the same key and merges progress / currentChapter / heroImage / totalChapters / tagline into the most-recently-updated row, so the library never shows two tiles for the same book even when the DB still holds legacy duplicates.
- **Book editing** (`PATCH /api/me/books/:id`): trims/validates `title` & `author` (rejects empty), and accepts `tagline`, `heroImage`, `coverGradient`, `totalChapters` in addition to the previously-patchable fields.
- **Orphan scene recovery** (`/api/me/orphan-scenes`): `GET` lists groups of scenes whose `user_book_id` no longer matches any `user_books` row for the current user (LEFT JOIN). `POST /claim` creates a new book row (or reuses a canonical match by `lower(trim(title))+lower(trim(author))`) and rewrites `user_scenes.user_book_id` to point at it. `DELETE /:userBookId` removes all matching orphan scenes. Both mutating endpoints refuse to operate on ids whose book row still exists, and scope by `user_id` so cross-user reassignment/deletion is impossible.
- AI: uses `@workspace/integrations-openai-ai-server` (gpt-5.4 + gpt-image-1)
- Auth: Clerk via `@clerk/express` `clerkMiddleware`. `requireAuth` middleware on `/api/me/*` enforces signed-in (Clerk `getAuth(req).userId`).
- CORS is restricted to `REPLIT_DOMAINS` + `REPLIT_DEV_DOMAIN` (http/https). Same-origin / no-Origin requests pass through.
- Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-provisioned), `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `SESSION_SECRET`
- **Storage model**: scene PNGs are uploaded to App Storage under `${PRIVATE_OBJECT_DIR}/scene-images/<uuid>` and stored in `image_cache.object_path` as `/objects/scene-images/<uuid>`. The web client receives `imageUrl = /api/storage/objects/scene-images/<uuid>`. The storage GET route only serves an allow-list of namespaces (currently `scene-images`); other private objects are 404. Legacy base64 column (`image_b64`) is nullable for backward compat.
- **Per-user library tables** (in `lib/db`): `app_users` (clerkUserId PK, defaultVisualStyle, spoilerMode, readingMode, onboardedAt), `user_books` (userId, title, author, source: demo|upload|manual, demoBookId?, visualStyle, spoilerMode, currentChapter/Page, progress…), `user_scenes` (userId, userBookId, chapterNumber, sceneIndex, title/narration/location/mood/characters/gradientColors/imagePrompt/imageUrl, sceneCacheKey/imageCacheKey), `book_bibles` (one per user_book, uniqueIndex on userBookId; series/bookNumber/genre/tone/setting/locations/factions/characters/ships/tech/species/objects/sources + reader-only fields userNotes/focusAreas/avoidNotes; `contextVersion` bumps on every PUT to bust scene cache). Scene upserts are idempotent on (userBookId, chapterNumber, sceneIndex) with `imageUrl` updated via `COALESCE(EXCLUDED.image_url, existing)` so partial generations don't regress.

### `artifacts/jump-the-book-web` — React + Vite web app (primary)
Jump the Book — web reading companion. Reader uploads an EPUB (parsed entirely in-browser via JSZip) or picks a public-domain demo book, gets spoiler-safe AI scenes for the chapter they're on, and views them as Comic (stacked panels) or Cinematic (full-screen with narration).

**Stack**: React 19, Vite, TypeScript, Tailwind v4, shadcn/ui (Radix), wouter, framer-motion, TanStack Query, Clerk (`@clerk/react` + `@clerk/themes`).

**Routes**: `/` Home, `/sign-in/*?`, `/sign-up/*?`, `/onboarding`, `/library`, `/upload`, `/setup-book` (Smart Book Setup wizard), `/generate`, `/book/:id`, `/position/:id`, `/experience/:id` (Cinematic), `/comic/:id`, `/playback/:id?chapter=N` (Story Playback / chapter trailer using browser SpeechSynthesis), `/account/*?` (Clerk `<UserProfile>` for linking Google/Apple/email + reading-preferences card; signed-out → `/sign-in`), `/help`.

- **Editing books & recovering orphans** — `book-detail.tsx` shows an inline "Edit" button next to the title for signed-in users with a resolved `RemoteBook` (looked up by URL UUID or `userBook.remoteId`); it opens `<EditBookDialog>` which `PATCH`es `/api/me/books/:id` (title/author/tagline/heroImage/totalChapters). The same dialog runs in "claim-orphan" mode from `<SceneLibrary>`, which flags scene groups whose `userBookId` has no matching book row in amber and offers Recover (claim) / Forget (delete) actions. Hooks `useOrphanSceneGroups`, `useClaimOrphanScenes`, `useDeleteOrphanScenes` (in `useApiLibrary.ts`) cache-invalidate `me/books`, `me/scenes`, `me/orphan-scenes` after mutation. The dialog's seed-form effect deps on a stable `modeKey` string (`edit:<id>` or `claim:<id>`), never on the `mode` object literal, so parent re-renders never wipe in-progress edits.

**Companion features layered on top of Smart Setup**:
- **Voice capture** — `<VoiceCaptureButton>` (`src/components/voice-capture-button.tsx`) wraps Web Speech API (`window.SpeechRecognition` / `webkitSpeechRecognition`, typings in `src/lib/speechRecognition.ts`). Used by the setup wizard's "What just happened" / excerpt fields and by the bible editor's long-text fields via `<DictatedTextarea>`.
- **Cover picker** — `<CoverPicker>` (`src/components/cover-picker.tsx`) shows top Open Library cover thumbnails for the typed (title, author) on Step 1; the chosen cover URL is persisted as `user_books.heroImage`. Falls back to a stylized gradient.
- **Refresh metadata** — `clearEnrichmentCache(title, author)` in `useOpenLibraryEnrichment` drops the cached lookup; library tile (hover) and book-detail expose refresh-cover affordances.
- **Welcome hero** — `<WelcomeHero>` (`src/components/welcome-hero.tsx`) at the top of `/library`: amber date+time pill (live, 30s tick), "Welcome back, {firstName}." (italic name) headline that switches to "Welcome to Jump the Book." for signed-out, contextual subtext derived from `nowReading` (chapter X queued / shelf empty / pick a book), and Upload + "Continue reading" CTAs (the latter swaps to "Add a book" when the shelf is empty).
- **Now Reading hero** — `<NowReadingHero>` pinned to the top of `/library` below the welcome hero, picks the active book or the most-recently-updated book in `userLibrary` (the `/api/me/books` list is ordered by `desc(updatedAt)`). Magazine-style 2-column layout: image stage on the left (latest scene image → cover → gradient fallback) with a chapter/scene caption pill, and on the right an italic narration blockquote pulled from the latest `RemoteScene.narration` (falls back to `book.tagline`), an amber "CONTINUE READING" pill, the gold progress bar, and Resume + All scenes buttons. Library page resolves the latest scene by preferring `nowReading.remoteId` then demoBookId/id, finally lower-cased title+author.
- **Reading stats strip** — `<ReadingStats>` (`src/components/reading-stats.tsx`) collapsed from 6 colorful cards to 5 minimal columns inside one bordered card (Currently reading / In library / Scenes generated / Streak / Time read). Hides only when `totalBooks === 0` so a freshly-added first book still gets the row.
- **Brand mark** — `public/logo.svg` and `public/favicon.svg` are a stylized rabbit head in the brand amber gradient (no more compass). Header in `src/components/layout.tsx` shows the bunny SVG plus an italic-serif wordmark "Jump *the* Book".
- **Header search** — `<HeaderSearch>` inside `layout.tsx` (md+ only, all visitors). Submits to `/library?q=<encoded>`. `pages/library.tsx` reads `window.location.search` reactively (re-runs on every wouter `useLocation` change) and case-insensitive-filters `userLibrary` by title/author. The "My books" subtitle becomes "Showing N of M for "q"" with a "Clear search ✕" affordance, and the empty state offers a clear-search link plus an "add a new book" link to Smart Setup.
- **Snap the page** — `<SnapPageButton>` (`src/components/snap-page-button.tsx`) sits in the `<PastePassage>` header next to the title. Uses `<input type="file" accept="image/*" capture="environment">` so phones open the back camera directly. Resizes the photo to a 1600px long edge JPEG @ 0.85 (keeps phone shots well under the 5MB JSON body limit), POSTs the data URL to `POST /api/passage/ocr`, and appends the returned text to the passage textarea. Signed-in only (gated by `<Show when="signed-in">`).
- **OCR endpoint** — `artifacts/api-server/src/routes/passage.ts` mounts `POST /api/passage/ocr`. Requires a Clerk session (`getAuth(req)?.userId`), validates the body is a `data:image/*` data URL ≤ ~7.5MB, and asks `gpt-5.4` (chat.completions, vision) to extract the prose verbatim with a strict OCR system prompt (no page numbers, no summaries, empty string if not a book page). Returns `{ text }` or `422` if the model returned nothing useful.
- **Snap a cover** — `<SnapCoverButton>` (`src/components/snap-cover-button.tsx`) mirrors the snap-the-page pattern: `<input capture="environment">` opens the phone's back camera, the photo is resized to a 1280px-edge JPEG @ 0.85, and POSTed to `POST /api/books/cover/identify`. The endpoint (`artifacts/api-server/src/routes/cover.ts`, mounted via `routes/index.ts`) is auth-required, validates a `data:image/*` payload ≤ ~4.5MB, and asks `gpt-5.4` with `response_format: { type: "json_object" }` to return strict JSON `{ title, author, confidence, note? }`. The model returns `{title:"", author:""}` (and the route 422s) when the cover is unreadable. The client then opens `<CoverPickerDialog>` which runs the (title, author) through the existing `searchOpenLibrary` helper, shows the top 3 matches with cover thumbs (auto-selects #1), and on confirm calls `useLibrary().addBook` with `source: "manual"` — reusing the same dedup path Smart Setup uses, so re-snapping the same book just lands on the existing shelf row. The dialog has a Pencil-icon "Edit" affordance to revise the search if the vision read was wrong (re-queries Open Library on each keystroke, debounced by React Query). The button is wired into `/library` in three places: the empty-state hero, the empty-list `<Plus>` row, and the "have books" quiet-add banner. Signed-in only (gated by `<Show when="signed-in">`), and works on mobile browsers (the `capture="environment"` attribute opens the iOS/Android back camera natively). The native Expo app does not yet have Clerk wired up, so the snap-cover flow is currently web-only; once mobile auth lands the same endpoint can serve it.
- **Discover page** (`/discover`) — `pages/discover.tsx`, registered in `App.tsx`, linked from the header nav. Hero, a "Bring your own book" duo (Smart Setup + Upload), an optional "Most explored" rail (signed-in users with scenes — ranks `userBookId` by `useRemoteSceneLibrary` count), curated `CATEGORIES` over `DEMO_BOOKS` (Wonder & whimsy / Shadow & dread / Cases to crack), and a footer Smart Setup CTA.
- **Google sign-in** — handled entirely by Clerk. To enable: in the Clerk Dashboard → User & Authentication → Social Connections → toggle Google on. The existing `<SignIn />` and `<SignUp />` pages auto-render the Google button with our `socialButtonsBlockButton` styling — no code change needed.
- **Scene Library** — `<SceneLibrary>` (`src/components/scene-library.tsx`) replaces the old flat scene grid: search bar, "Recently generated" rail, and per-book → per-chapter collapsible groups. Each chapter group has a "Play trailer" link to `/playback/:bookId?chapter=N`.
- **Softer Smart Setup banner** — `/library` shows the big amber banner only when the user has zero books; once they add one, the banner shrinks to a quiet single-line "Add a book" row.

**Smart Book Setup** (`/setup-book`):
- 4-step wizard for adding a modern book (Kindle/Audible/anything we don't have a file for): Identify → Build bible (calls public `POST /api/books/context/search`) → Review/edit (full `<BibleEditor>` form) → Save & open book.
- `?bookId=<uuid>` mode hydrates from an existing bible and skips to Step 3 (edit-existing flow used from `book-detail`).
- The wizard creates the user_book on save (via `addBook`) for new books, then PUTs the bible. If the wizard collected an excerpt or "what just happened", it stashes them under `sessionStorage["@jtb_pending_reading_context"]` and navigates to `/generate`.
- `pages/generate.tsx` auto-loads the saved bible (after `resolveRemoteBookId`) and forwards `bookBibleId` + `whatJustHappened` to `/api/scenes/generate`. The server injects character/world/locations/avoid context into the prompt and mixes the bible's `id:contextVersion` tag into the cache key (via the excerpt slot) so editing a bible naturally invalidates cached scenes.
- Bibles are surfaced on `pages/book-detail.tsx` for signed-in users as a Book Bible card showing series/genre/tone chips, summary, character/location/faction counts, and avoid notes; "Edit" links back to `/setup-book?bookId=<uuid>`. For demo-mapped books the URL `id` is a slug (e.g. `alice`), so the page resolves the backend UUID via `userBook.remoteId` (added to `UserLibraryItem`) before fetching the bible.
- The library page shows a prominent "Smart Setup" CTA above the book grid for signed-in users **and** a small amber "Bible" badge on each tile that has one. The badge is wired through a single bulk fetch (`useUserBibleSummaries` → `/api/me/bibles/summaries`, 30s staleTime, invalidated on `useSaveBookBible.onSuccess`) — no per-tile request. The library page maps each summary's `userBookId` (UUID) to the displayed tile id via `bookIdMap` so demo-slug tiles are also badged.

**Auth & onboarding**:
- `App.tsx` wraps the router in `<ClerkProvider>` with the dark cinematic shadcn theme. In dev the publishable key is used directly (Clerk CDN); in prod (`VITE_CLERK_PROXY_URL` set) the key is derived from the current host via `publishableKeyFromHost` so the same build serves multiple custom domains.
- `HomeRedirect`: signed-out → marketing home; signed-in + not onboarded → `/onboarding`; signed-in + onboarded → `/library`.
- `pages/onboarding.tsx` — 3-step wizard (visual style, spoiler mode, optional first book) → `PATCH /me { markOnboarded: true }`.
- `components/layout.tsx` exposes a UserMenu dropdown (avatar, sign out) for signed-in users; signed-out shows Sign in / Get started.

**Data layer**:
- `src/data/books.ts` — demo book catalog (Alice, Dracula, Frankenstein, Sherlock) + chapters, characters, scenes; `SCENE_IMAGES` points to static `/scenes/<id>.png` files in `public/scenes/`.
- `src/lib/library.ts` — `useLibrary()` is **auth-aware**: signed-in users read/write through React Query against `/api/me/*`; signed-out users continue to use localStorage. Same hook surface either way. `addBook` is async and returns the canonical (real) id — callers must await before navigating. `resolveRemoteBookId(book)` maps a URL id (demo slug or UUID) to the backend `user_books.id`, creating the row if missing.
- `src/hooks/useApiLibrary.ts` — React Query hooks: `useRemoteUser`, `useUpdateRemoteUser`, `useRemoteBooks`, `useAddRemoteBook`, `usePatchRemoteBook`, `useDeleteRemoteBook`, `useRemoteBookScenes(userBookId)`, `useRemoteSceneLibrary`, `useSaveRemoteScene`.
- `src/lib/epub.ts` — `parseEpubFromArrayBuffer()` browser-side EPUB parser.
- `src/hooks/useGenerateScene.ts` — calls `/api/scenes/generate` then `/api/scenes/image` with bounded concurrency, exposes `onScenesReady` / `onImageReady` callbacks. Consumes `imageUrl` (URL string) — never base64. `GenerateSceneParams` accepts optional `excerpt` (chapter text, sliced to 3000 chars on server) and `sceneCount` (1–5, clamped server-side). Browser cache key incorporates both so different excerpts/counts don't collide.

**Book detail page features** (`pages/book-detail.tsx`):
- `hooks/useOpenLibraryEnrichment.ts` — Shared hook: `searchAndFetchWork(title, author)` → `{ coverUrl (Large), details }`. localStorage cache `@jtb_enrich_v1_<djb2-hash>` with 7-day TTL. Accepts `{ enabled }` so consumers can opt out (e.g. when a book already has a built-in `heroImage`). One cached lookup per book is shared across the metadata card, the detail-page hero, and library tiles.
- `components/book-metadata.tsx` — Consumes the hook to render description + subject tags. Hides cleanly when no metadata is found.
- `components/library-book-tile.tsx` — Per-row component for the library grid (each row needs its own hook call). Falls back to the Open Library cover when `book.heroImage` is missing; otherwise renders the local image and skips the network call entirely. The detail page hero (`pages/book-detail.tsx`) does the same fallback, sharing the cache so it's a single fetch per book.
- `components/paste-passage.tsx` — Headline "paste a passage" entry point: textarea (200–6000 chars) + scene count toggle (Quick 1 / Standard 3 / Full 5). On submit, writes a `PendingPassage { bookId, chapter, excerpt, sceneCount, savedAt }` to sessionStorage and navigates to `/generate`. The "Generate Scenes" button below remains as a fallback for users who don't want to paste.
- `pages/generate.tsx` reads the pending passage via lazy `useState` initializer (so it's captured exactly once), clears sessionStorage in an effect, and forwards `excerpt` + `sceneCount` into `generateScenesWithImages`. UI heading switches to "Visualizing your passage" with a chip showing the scene count when a passage is present.
- Server (`routes/scenes.ts`): `clampSceneCount` enforces 1–5, prompt template switches between "Generate exactly N scenes" and the legacy "3-5 scenes". `makeSceneCacheKey` includes `excerptHash` and `sceneCount` so cache lookups are correct.

**Auto-save**:
- `pages/generate.tsx` resolves the remote book id once per run, then upserts each scene on `onScenesReady` (metadata) and again on `onImageReady` (image URL). All run state (`active` flag, `runRemoteBookId`, `runScenes`) is captured in the effect closure so callbacks from a prior chapter/book run can never persist into a different target.
- `pages/experience.tsx` and `pages/comic.tsx` hydrate scenes by priority: server-saved (via `useRemoteBookScenes`) → in-browser cache → demo baked. This makes saved scenes available across devices, not just in the browser that generated them.
- `pages/library.tsx` shows a third "Your Scene Library" masonry section for signed-in users from `useRemoteSceneLibrary`, with a sign-in CTA for signed-out visitors.

**Theme**: dark cinematic — Playfair Display (serif) + Plus Jakarta Sans, deep plums/oxbloods/dusty golds/midnight blues. Palette in `src/index.css` `:root` and `.dark` blocks (HSL tokens compatible with shadcn/ui).

### `artifacts/jump-the-book` — Expo mobile app (route `/mobile`)
Jump the Book — AI-powered visual reading companion. Drop an EPUB → choose Comic or Cinematic → watch the chapter as AI-generated panels. **Phase 1 (Clerk auth + shared lib), Phase 2 (remote library backed by `/api/me/books`), and Phases 3–6 (snap-cover, snap-page, Smart Setup wizard, edit-book, Now Reading hero + Scenes rail + Discover screen, Account screen + orphan recovery) are all shipped — feature parity with web.**

**Mobile parity surfaces (Phases 3–6)**:
- `components/SnapCoverButton.tsx` + `components/CoverPickerModal.tsx` — `expo-image-picker` (camera) → `expo-image-manipulator` (resize 1280px JPEG @0.85, base64) → `POST /api/books/cover/identify` → Open Library top-3 picker → `addBook({source:"manual"})`. Wired into the library tab as a tile.
- `components/SnapPageButton.tsx` — `useSnapPageOcr` (in `hooks/useBookBible.ts`) calls `POST /api/passage/ocr` and appends extracted prose. Mounted in the bible editor's long-text fields.
- `app/setup-book.tsx` — 3-step Smart Setup wizard (Identify → Build bible via `POST /api/books/context/search` → Review with `<BibleEditor>`). `?bookId=<uuid>` mode hydrates an existing bible and skips to Step 3 (used from book detail's "Edit story bible" button). Saves via `useBookBible.save()` then optionally pushes to `/generate` with `whatJustHappened` + `excerpt` stashed in AsyncStorage.
- `components/EditBookModal.tsx` — title/author/tagline/heroImage/totalChapters editor that PATCHes `/api/me/books/:id`. Fed a canonical `RemoteBook` (imported from `@workspace/jump-the-book-shared`) so totalChapters etc. survive the round trip.
- `components/NowReadingHero.tsx` — magazine-style "Continue reading" stage pinned above the library list. Uses the latest `RemoteScene.imageUrl` for the hero image (falls back to the book's cover gradient), italic narration blockquote, gold progress bar, and Resume + All scenes buttons.
- `components/ScenesSection.tsx` — horizontal "recently generated" rail of the most recent six scenes from `useRemoteSceneLibrary`, plus per-book scene-count chips. Orphan groups are filtered out here — recovery lives on the Account screen.
- `app/discover.tsx` — Non-tab screen mirroring web's `/discover`: hero, Bring-your-own duo (Smart Setup + Upload), "Most explored" tiles ranked by per-book scene counts (signed-in only, only when there are scenes), curated demo categories (Wonder & whimsy / Shadow & dread / Cases to crack), footer CTA. Linked from a "Discover" pill in the library tab header.
- `app/account.tsx` — Identity card (name + email + sign-out via `@clerk/expo` `useUser`/`useAuth`), orphan recovery section (lists `useOrphanScenes()` groups with Recover/Forget actions), and a pointer to the Settings tab for visual/spoiler/reading prefs. Linked from the top of the Settings tab.
- `components/ClaimOrphanModal.tsx` — Title + author capture used by Account → "Recover". Calls `useClaimOrphanScenes()` which `POST`s `/api/me/orphan-scenes/claim` and invalidates `me/books`, `me/scenes`, and `me/orphan-scenes`.
- New hooks in `hooks/useRemoteLibrary.ts`: `useOrphanScenes`, `useClaimOrphanScenes`, `useDeleteOrphanScenes` (mirror the web counterparts in `useApiLibrary.ts`). Shared `RemoteScene` shape was tightened so `CoverIdentifyResult` matches the actual API response (`{title,author,confidence,note?}`).

**Auth (Clerk via `@clerk/expo`)**:
- `app/_layout.tsx` wraps the app in `<ClerkProvider tokenCache={tokenCache} proxyUrl={EXPO_PUBLIC_CLERK_PROXY_URL}>` + `<ClerkLoaded>`. The `<AuthGate>` component uses `useSegments`/`useRouter` to bounce signed-out users into `/(auth)/sign-in` and signed-in users out of the `(auth)` group into `/(tabs)`. It also calls `setAuthTokenGetter(() => getToken())` from `@workspace/api-client-react` so every generated API hook automatically attaches the Clerk session token. `setBaseUrl(\`https://${EXPO_PUBLIC_DOMAIN}\`)` is called once at module scope.
- Custom email+password screens (no hosted UI): `app/(auth)/_layout.tsx`, `sign-in.tsx`, `sign-up.tsx`. Sign-up handles email-code verification (`signUp.verifications.sendEmailCode` / `verifyEmailCode`) and includes a `<View nativeID="clerk-captcha" />` for bot protection. All screens use the brand palette via `useColors` (amber `#c9974a` primary on midnight `#08081a`) and Inter fonts.
- Env wiring: dev script forwards `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY`. Production `scripts/build.js` forwards the same plus `EXPO_PUBLIC_CLERK_PROXY_URL=https://<deployment-domain><CLERK_PROXY_URL>` so prod builds talk to the Clerk Frontend API proxy mounted at `/api/__clerk` on the API server.
- Clerk-managed mode (no user secrets): `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` are auto-provisioned. Token cache is the official `@clerk/expo/token-cache` (`expo-secure-store`-backed).

**Shared lib `@workspace/jump-the-book-shared`** (`lib/jump-the-book-shared/`):
- Composite TS lib (declared in root `tsconfig.json` references). Houses code that must stay in lockstep between web and mobile so parity drift can't happen silently:
  - `src/openLibrary.ts` — `searchOpenLibrary`, `getOpenLibraryCoversForBook`, edition lookups (verbatim copy of the web helper, single source of truth).
  - `src/types.ts` — `VisualStyle`, `SpoilerMode`, label maps, `UserLibraryItem`, `CoverIdentifyResult`. Phase 2 added `RemoteUser`, `RemoteBook`, `RemoteScene`, `AddBookInput`, and the `remoteBookToUserLibraryItem(b)` mapper that both apps use to project an API row onto the in-app library shape (id = remote uuid, source = `demo` for `demoBookId !== null` else `user-added`, `progress` clamped 0–1, etc.).
  - `src/index.ts` — barrel.
- The web app's `src/lib/openLibrary.ts` is now `export * from "@workspace/jump-the-book-shared"` (root export — Vite couldn't resolve a `.ts` subpath export). Mobile imports the same barrel.

**Phase 2 — Remote library wiring** (mobile parity with web's `/api/me/*` flow):
- `hooks/useRemoteLibrary.ts` mirrors web's `useApiLibrary.ts`: `useRemoteUser`, `useRemoteBooks`, `useAddRemoteBook`, `useDeleteRemoteBook`, `usePatchRemoteBook` etc., implemented via `customFetch` from `@workspace/api-client-react` (auto-attaches the Clerk bearer token via `setAuthTokenGetter`) and Clerk Expo's `useAuth`.
- `context/LibraryContext.tsx` — `userLibrary` is now derived from `useRemoteBooks()` mapped via the shared `remoteBookToUserLibraryItem`. `addBook` / `removeBook` / `updateProgress` POST/DELETE/PATCH to `/api/me/books`. Local UX state (settings, streak, sessions, positions, activeBookId) stays in AsyncStorage. The Context's public surface (`userLibrary`, `addBook` returning `Promise<string>` of the remote uuid, `removeBook`, `updateProgress`, etc.) is preserved so no consumer screen needed to change.
- `_layout.tsx` mounts `<LibraryProvider>` **inside** `<AuthGate>`. AuthGate doesn't render its children until Clerk reports `isLoaded` AND `setAuthTokenGetter` has been installed AND the current route matches the auth state — which means the very first authed `/api/me/books` request can never fire without a bearer token. The gate also clears the React Query cache (`queryClient.clear()`) whenever the Clerk `userId` changes so a previous user's books can never briefly bleed through to a new session.
- `useAddRemoteBook.onSuccess` seeds `['me','books']` with the returned row (`setQueryData`) before invalidating, so screens that immediately `router.push('/experience/' + bookId)` after `addBook` don't race the background refetch and hit "Book not found".

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
