# Overview

This is a pnpm workspace monorepo using TypeScript, designed to be a web reading companion application called "Jump the Book". The project's main purpose is to allow users to upload books (EPUBs or public domain demos) and generate spoiler-safe AI-powered scenes for the chapters they are reading. These scenes can be viewed in Comic (stacked panels) or Cinematic (full-screen with narration) modes.

The project aims to provide an immersive and interactive reading experience by integrating AI for content generation, robust book management features including deduplication and orphan scene recovery, and a user-friendly interface for managing personal libraries and preferences. It leverages a modern web stack and is designed for scalability and maintainability.

# User Preferences

I prefer iterative development, with small, focused changes. Please ask before making any major architectural changes or introducing new dependencies. I prefer clear and concise explanations for any complex logic or decisions.

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
    *   **Book Editing:** `PATCH /api/me/books/:id` allows updating title, author, tagline, heroImage, and totalChapters.
    *   **Orphan Scene Recovery:** `/api/me/orphan-scenes` identifies and allows claiming or deleting scenes whose parent book no longer exists.
    *   **Smart Book Setup Wizard (`/setup-book`):** A 4-step wizard for adding modern books, building a "bible" (context for AI), reviewing, and saving. Integrates with `POST /api/books/context/search`.

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

10. **Mobile App Integration:**
    *   A separate Expo mobile app consumes the same API.
    *   Shared code for data models (`RemoteUser`, `RemoteBook`, `RemoteScene`) and API client (`Orval-generated React Query hooks`) is synced between web and mobile repos via a GitHub Actions workflow.

# External Dependencies

*   **OpenAI API:** Used for AI scene generation (`gpt-5.4`, `gpt-image-1`), OCR (`gpt-5.4` vision), and cover identification (`gpt-5.4` vision). Access is proxied via Replit AI Integrations.
*   **Clerk:** Used for user authentication, authorization, and user management (`@clerk/express`, `@clerk/react`, `@clerk/themes`).
*   **PostgreSQL:** Relational database for storing application data.
*   **Drizzle ORM:** TypeScript ORM for interacting with PostgreSQL.
*   **JSZip:** Browser-side EPUB parsing.
*   **Open Library API:** Used for fetching book metadata and cover images.
*   **Web Speech API:** Used for voice capture functionality in the browser.
*   **Google Sign-In:** Handled by Clerk for user authentication.