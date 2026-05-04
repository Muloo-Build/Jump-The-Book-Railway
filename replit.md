# Overview

This is a pnpm workspace monorepo using TypeScript, designed to be a web reading companion application called "Jump the Book". The project's main purpose is to allow users to upload books (EPUBs or public domain demos) and generate spoiler-safe AI-powered scenes for the chapters they are reading. These scenes can be viewed in Comic (stacked panels) or Cinematic (full-screen with narration) modes.

The project aims to provide an immersive and interactive reading experience by integrating AI for content generation, robust book management features including deduplication and orphan scene recovery, and a user-friendly interface for managing personal libraries and preferences. It leverages a modern web stack and is designed for scalability and maintainability.

# User Preferences

I prefer iterative development, with small, focused changes. Please ask before making any major architectural changes or introducing new dependencies. I prefer clear and concise explanations for any complex logic or decisions.

**This web app is mobile-first** — designed primarily for Android users. The iOS version is a separate Expo/React Native project on Replit that shares the same API. All UI decisions should prioritize mobile viewport, touch targets, and mobile browser behavior (especially Android Chrome).

# System Architecture

The project is structured as a pnpm workspace monorepo.

**Core Technologies:**
- **Monorepo Tool:** pnpm workspaces
- **Backend:** Node.js 24, Express 5
- **Frontend:** React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, wouter, framer-motion, TanStack Query, Clerk
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build:** esbuild (CJS bundle)
- **AI Integration:** OpenAI (gpt-5.4, gpt-image-1) via Replit AI Integrations proxy

**UI/UX Decisions:**
- **Theme:** Dark cinematic theme with a palette of deep plums, oxbloods, dusty golds, and midnight blues. Uses Playfair Display (serif) and Plus Jakarta Sans for typography.
- **Components:** Leverages shadcn/ui (Radix) for UI components.
- **Branding:** Stylized rabbit head logo in an amber gradient, with "Jump *the* Book" wordmark.

**Key Features and Implementations:**

1.  **Book Management:**
    *   **EPUB Parsing:** Browser-side EPUB parsing using JSZip.
    *   **Book Deduplication:** Server-side logic (`/api/me/books`) to prevent duplicate book entries based on `(userId, demoBookId)` or `(userId, lower(trim(title)), lower(trim(author)))`. Merges progress and metadata for historical duplicates.
    *   **Book Editing:** `PATCH /api/me/books/:id` allows updating title, author, tagline, heroImage, totalChapters, readingStatus, seriesName, and seriesOrder.
    *   **Reading Status Tracking:** Books have a `reading_status` field (`reading`, `want-to-read`, `finished`). Auto-sets to `finished` when progress reaches 100%. Status can be changed via quick-toggle badges on book tiles and the PATCH endpoint. `GET /api/me/books?status=reading` supports filtering by status.
    *   **Series Awareness:** Books can have `series_name` and `series_order` fields. During Smart Setup, the CoverPicker's Open Library lookup triggers `fetchSeriesInfo()` to detect series membership. After saving, a series prompt (step 4) offers to add remaining series books as "Want to Read" entries.
    *   **Orphan Scene Recovery:** `/api/me/orphan-scenes` identifies and allows claiming or deleting scenes whose parent book no longer exists.
    *   **Smart Book Setup Wizard (`/setup-book`):** A 4-step wizard for adding modern books, building a "bible" (context for AI), reviewing, and saving. Integrates with `POST /api/books/context/search`. Step 4 (series prompt) appears when a series is detected.
    *   **Now Reading Page (`/now-reading`):** Shows books with `reading` status, including progress bars, scene counts, latest scene preview, and generate shortcuts. Empty states for signed-out users and no-books.
    *   **Bookshelf (`/library`):** Renamed from "Library" to "My Bookshelf". Features status tabs (All/Reading/Want to Read/Finished) with counts, scene counts on tiles, and reading status badges. On mobile (`<sm`) the WelcomeHero/NowReadingHero blocks are hidden because the bottom tab bar already handles orientation; ReadingStats is always shown.
    *   **Mobile-first navigation (Phase 1 UX overhaul):** A fixed bottom tab bar (`components/bottom-nav.tsx`) with 4 tabs — Now Reading / Bookshelf / Discover / Add — appears on mobile (`sm:hidden`, `z-[60]`, `pb-[env(safe-area-inset-bottom)]`). The horizontal top nav is hidden on mobile (`hidden sm:flex`) and Help moves into the avatar dropdown to reduce clutter. Main content has `pb-[calc(64px+env(safe-area-inset-bottom))]` on mobile to clear the bar.
    *   **State-based home redirect:** `SignedInHome` in `App.tsx` reads `useLibrary()` and routes signed-in, onboarded users by state — has a reading book → `/now-reading`; has any books → `/library`; empty shelf → `/upload`. Replaces the previous always-`/now-reading` redirect that dropped fresh users on an empty page.
    *   **Unified Add page (Phase 2 UX overhaul, route `/upload`):** Single screen labeled "Add" in the nav. Top of page has two priority entry tiles — **Smart Setup** (link to `/setup-book` for modern books) and **Snap a cover** (renders `SnapCoverButton` in tile variant; signed-out users see a sign-in CTA in its place). Below those, a 2-tab `Tabs` block — **Search** (Open Library typeahead via `BookSearch`) and **Upload file** (existing `parseBookFile` flow). The post-parse setup form (chapter/format/style/spoiler) is unchanged. Route name kept as `/upload` to preserve existing links from bottom-nav, top-nav, and Discover.
    *   **Bookshelf tile + stats mobile polish (Phase 5, partial):** Two side-component changes that don't touch `pages/library.tsx` (which has the in-flight series-collapse Task #15 merging). `LibraryBookTile` (`components/library-book-tile.tsx`): the Open Library "Refresh cover" button used `opacity-0 group-hover:opacity-100`, which is completely undiscoverable on touch devices. Visibility is now gated by INPUT CAPABILITY rather than viewport width — default state is `opacity-70`, hover-reveal is wrapped in `[@media(hover:hover)]:` so a touch tablet wider than `sm` still sees it (a viewport-width gate would have re-hidden it on those devices), and `focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/60` keeps it discoverable for keyboard users. Tap target bumped to `w-8 h-8 sm:w-7 sm:h-7`. Tightened tile chrome on mobile (`p-3 sm:p-4`, `space-y-1.5 sm:space-y-2`, title `text-sm sm:text-base`, author `text-xs sm:text-sm`) so the 2-col grid stays scannable at 360px. Capped the staggered entrance animation at the first 8 tiles (`Math.min(index, 8) * 0.04`) so a 30-book shelf doesn't take 1.5s of cascading delay before the bottom row renders. `ReadingStats` (`components/reading-stats.tsx`): tightened mobile cell padding (`py-2.5`), gap (`gap-0.5`), label tracking (`text-[9px] tracking-[0.2em]`), value size (`text-xl` instead of `text-2xl`), and hint size so the 5-stat strip occupies less vertical real estate above the book grid on mobile.
    *   **Now Reading mobile polish (Phase 4):** Tightened mobile spacing on `pages/now-reading.tsx` (`py-6 sm:py-10 md:py-12`, `space-y-6 sm:space-y-8`, `text-2xl sm:text-3xl md:text-4xl` on the H1) so the first reading card sits above the fold on a phone instead of being pushed off by desktop padding. Per-card CTA row: dropped the prior "Generate" button (it linked to the same `/experience/${id}?chapter=${chapter}` URL as "Continue" — a confusing duplicate that just stole tap target area), kept "Continue" as a flex-1 primary button and "Scenes" as a fixed secondary, both bumped to `h-11 sm:h-10` with `text-sm` and `w-4 h-4` icons so they're real Material-spec touch targets (44dp on mobile, 40dp on desktop). Empty-state and signed-out CTA rows now stack vertically on mobile (`flex-col sm:flex-row`) at the same `h-11` size so each gets a comfortable full-width tap. Empty-state "Add a book" CTA now points to `/upload` (the unified Add page from Phase 2) instead of `/setup-book`, matching the bottom-nav routing. Removed the now-unused `ImagePlus` import.
    *   **Cover-first Discover trending (Phase 3):** `TrendingBookCard` in `pages/discover.tsx` no longer displays user-generated scene images. It now leads with the book's public Open Library cover, fetched via `useOpenLibraryEnrichment(title, author)` (7-day localStorage cache). Activity numbers (sceneCount, uniqueChapters) appear as a thin metadata strip below the title; a "HOT" badge marks the top 3. Aspect ratio is 2:3 (book cover) instead of the previous 3:4 scene mosaic. On `<img>` error or OL miss, the card falls back to a `BookOpen` icon + title.
    *   **Trending privacy fix (Phase 3):** `GET /api/trending` (in `artifacts/api-server/src/routes/trending.ts`) used to return up to 4 generated scene image URLs per trending book, sourced from the cross-user `imageCache`. This effectively published one user's generations to every anonymous Discover visitor. The route now hard-codes `sampleImages: []` and removes the underlying query + `objectPathToUrl` call. Aggregate counts (`sceneCount`, `imageCount`, `uniqueChapters`, `totalHits`) remain — they're aggregated metadata, not per-user content. The field is preserved on the response shape (back-compat) until a per-user `shareToTrending` opt-in is added.
    *   **Per-user `shareToTrending` opt-in (Phase 3.5):** Layered on top of the trending privacy fix. Three schema changes: `app_users.share_to_trending boolean not null default false`, `app_users.share_to_trending_enabled_at timestamptz` (timestamp the user most recently switched the toggle on; null means never opted in) (both in `lib/db/src/schema/userLibrary.ts`), and `image_cache.creator_user_id text references app_users.user_id on delete set null` + `image_cache_creator_idx` (in `lib/db/src/schema/sceneCache.ts`). `saveCachedImage()` (in `artifacts/api-server/src/lib/sceneCache.ts`) now accepts `opts.creatorUserId`, writes it on insert, and switches to `onConflictDoNothing` — the cache key is fully derived from canonical inputs, so a conflict means another user generated for the same logical scene; we must NOT overwrite the existing `objectPath` (which would re-publish a non-opted-in user's bytes under an opted-in original creator's row) or `creatorUserId` (which would mis-attribute). Both call sites in `routes/scenes.ts` (`/scenes/generate` and `/scenes/image`) pass `requireAuth`'s `userId`. `GET /api/trending` rebuilds `sampleImages` via a raw-SQL window query that joins `image_cache` to `app_users` on `share_to_trending = true AND share_to_trending_enabled_at IS NOT NULL AND ic.generated_at >= au.share_to_trending_enabled_at` (so flipping the toggle on does NOT retroactively expose images generated while it was off) and uses `ROW_NUMBER() PARTITION BY (book_title, author) ORDER BY generated_at DESC` capped at 4, so a single chatty creator can't flood a card. `routes/me.ts` adds `shareToTrending` to `serializeUser`, the `PatchMeBody` interface and PATCH handler with a `typeof === "boolean"` guard, and stamps/clears `shareToTrendingEnabledAt` on every PATCH that includes the field (`true` → `new Date()`, `false` → `null`). The web client gets a new `PrivacyCard` in `pages/account.tsx` (rendered between `ReadingProfileCard` and the Profile & security section) using the shadcn `Switch`; the toggle uses optimistic local state and invalidates `["trending"]` on change. `RemoteUser` in `hooks/useApiLibrary.ts` now declares `shareToTrending: boolean`. Default is OFF — no images leak unless the user explicitly opts in.

2.  **Scene Generation and Viewing:**
    *   **AI Scene Generation:** `POST /api/scenes/generate` uses `@workspace/integrations-openai-ai-server` (gpt-5.4 + gpt-image-1) to create scenes.
    *   **Image Storage:** Scene PNGs are stored in App Storage (`${PRIVATE_OBJECT_DIR}/scene-images/<uuid>`) and served via `/api/storage/objects/scene-images/<uuid>`.
    *   **Mobile Auth for Scene Generation:** `useGenerateScene.ts` uses `apiFetchWithTimeout` (wrapping `apiFetch` from `queryClient.ts`) so all scene/image generation requests carry Bearer tokens — fixing Safari ITP cookie-stripping that caused 401s mid-generation on mobile.
    *   **Image URL Persistence:** `persistScene` in `generate.tsx` is NOT gated on the effect's `active` flag, so image URLs are persisted even if the user navigates away before all images finish painting. Server-side backfill (`backfillSceneImageUrls.ts`) runs on every cold start to link orphaned scene rows to their already-generated images via `image_cache_key`.
    *   **Scene Viewing Modes:** Comic (stacked panels) and Cinematic (full-screen with narration) modes.
    *   **Scene Library:** Collapsible, per-book, per-chapter organization of generated scenes with search and "Play trailer" links.

3.  **User Authentication and Authorization:**
    *   **Auth Provider:** Clerk (`@clerk/express`, `@clerk/react`).
    *   **Middleware:** `clerkMiddleware` and `requireAuth` (`/api/me/*`) enforce authenticated access.
    *   **Onboarding:** A 3-step wizard (`/onboarding`) for new users to set visual style, spoiler mode, and add an optional first book.
    *   **Account page (`/account`):** Bunny avatar picker (10 styles in `public/avatars/bunny-*.png`, allow-list mirrored in `data/avatars.ts` and `me.ts`), multi-select "default visual styles" with a separate "primary" promotion (singular `defaultVisualStyle` is kept as canonical for back-compat; plural `defaultVisualStyles` is the multi-select pool — empty array means "use the singular default"), and a Reading Profile (favourite genres, platforms, reading pace, about-me free text). Two debounced auto-save cards live on the page; `useUpdateRemoteUser` invalidates the `["me"]` query on success (rather than blindly writing the response into the cache) to avoid out-of-order PATCH responses overwriting newer in-flight edits across cards. Avatar PATCH writes the cache directly for instant header swap. Header avatar in `components/layout.tsx` prefers the chosen bunny over the Clerk photo.

4.  **Content Enrichment:**
    *   **Open Library Integration:** `useOpenLibraryEnrichment` hook searches and fetches book cover URLs and details from Open Library, with local storage caching.
    *   **Voice Capture:** `<VoiceCaptureButton>` utilizes Web Speech API for dictating text into input fields.
    *   **Image-based Inputs:**
        *   **Snap the Page (`POST /api/passage/ocr`):** Uses `gpt-5.4` (vision) to extract text from an image of a book page.
        *   **Snap a Cover (`POST /api/books/cover/identify`):** Uses `gpt-5.4` (vision) to identify title and author from a book cover image, integrating with Open Library search.

5.  **Data Layer and State Management:**
    *   **React Query:** Used for data fetching, caching, and synchronization with the API (`useApiLibrary.ts`).
    *   **Auth-aware Library Hook:** `useLibrary()` abstracts data access, using React Query for signed-in users and localStorage for signed-out users.

6.  **Image Generation Safety & Consistency:**
    *   **Character visual consistency:** When the bible includes `characterProfiles[].visualTraits`, every image prompt re-states the same visual signature for any character that appears in the scene, so the same character looks the same across scenes of the same book.
    *   **Safety suffix:** All image prompts append a stylized-only / no-photoreal / no-recognizable-people / no-trademarks clause (`SAFETY_SUFFIX` in `routes/scenes.ts`). Versioned via `SAFETY_POLICY_VERSION`; bump it whenever the policy text changes.
    *   **Image cache key (v3)** includes a `consistencySignature` derived from the safety policy version + resolved per-scene character clause, so different bibles (or two users) cannot collide on the same key.

7.  **Anonymous Smart Setup & Shareable Scenes:**
    *   **Anonymous Smart Setup:** The `/setup-book` wizard works without sign-in. The full draft (book metadata + bible) is auto-persisted in localStorage under `@jtb_pending_book_setup_v1`. When the user clicks "Save", we redirect to `/sign-up?redirect_url=/setup-book?claim=1`; on return, an auto-claim effect re-fires the same save logic, clears the pending draft, and lands the user on their book.
    *   **Shareable scenes:** Scene cards in `/comic/:id` have a Share button that builds a URL pointing at the api-server's `GET /api/share/scene` endpoint. That endpoint renders OG/Twitter meta tags from query params (sanitized + HTML-escaped + img URLs validated as http/https) and `<meta refresh>`-redirects real users to the SPA `/scene-share` page. No auth, no DB lookup — all data is in the URL.
    *   **Public route ordering:** `routes/index.ts` mounts public routers (health, share, storage, scenes, passage, cover) BEFORE routers that apply `requireAuth` at the router level (me, bibles). Otherwise the auth middleware intercepts requests for routes it doesn't even own.

8.  **PWA / Offline:**
    *   `public/manifest.webmanifest` + theme/apple-touch-icon links in `index.html` make the web app installable.
    *   `public/sw.js` registered in `main.tsx` (prod-only) — cache-first for `/api/storage/objects/scene-images/*` (`jtb-scenes-v1`) so previously viewed scenes are available offline; network-first with cache fallback for the app shell (`jtb-shell-v1`); pure passthrough for API JSON and third-party.

9.  **Book Parsing Limits:**
    *   EPUB and PDF parsers cover full novels (up to 200 chapters, 12000 chars per chapter, PDF page limit 1500). EPUB yields to the event loop every 10 chapters to keep the UI responsive.

10. **Popularity Tracking & Trending:**
    *   **Cache hit tracking:** `scene_cache` and `image_cache` tables have `hit_count` and `last_accessed_at` columns. `getSceneBundle` and `getCachedImage` fire-and-forget increment hits on every cache read.
    *   **Public trending API:** `GET /api/trending` (no auth) aggregates scene and image cache data by book title/author, returning top 20 books ranked by total hits with sample image URLs.
    *   **Discover page "Popular right now":** Shows trending books with image mosaics (4-image grid or single hero), scene/image counts, and flame badges for top 3. Clicking a trending book pre-fills the Smart Setup form with title/author.

11. **Mobile App Integration:**
    *   A separate Expo mobile app (in a different Replit project) consumes the same API with the same Clerk auth.
    *   Shared code for data models (`RemoteUser`, `RemoteBook`, `RemoteScene`) and API client lives in `lib/jump-the-book-shared`. Note: the shared `RemoteUser` type is currently missing some fields the web uses (`avatarId`, `defaultVisualStyles`, `favoriteGenres`, `readingPlatforms`, `readingPace`, `aboutMe`) — needs syncing.
    *   A complete mobile design system lives in `mobile-design-spec/` (tokens, components, screen variants).
    *   **`MOBILE_HANDOFF.md`** — comprehensive handoff document for the mobile project covering the full API reference (28 endpoints), data types, database schema, user flows, design system, auth setup, and environment configuration.

# External Dependencies

*   **OpenAI API:** Used for AI scene generation (`gpt-5.4`, `gpt-image-1`), OCR (`gpt-5.4` vision), and cover identification (`gpt-5.4` vision). Access is proxied via Replit AI Integrations.
*   **Clerk:** Used for user authentication, authorization, and user management (`@clerk/express`, `@clerk/react`, `@clerk/themes`).
*   **PostgreSQL:** Relational database for storing application data.
*   **Drizzle ORM:** TypeScript ORM for interacting with PostgreSQL.
*   **JSZip:** Browser-side EPUB parsing.
*   **Open Library API:** Used for fetching book metadata and cover images.
*   **Web Speech API:** Used for voice capture functionality in the browser.
*   **Google Sign-In:** Handled by Clerk for user authentication.