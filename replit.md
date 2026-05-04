# Overview

This project, "Jump the Book," is a web-based reading companion application. Its primary purpose is to enhance the reading experience by allowing users to upload books (EPUBs or public domain demos) and generate spoiler-safe, AI-powered scenes for specific chapters. These scenes can be viewed in either Comic or Cinematic modes, offering an immersive and interactive way to engage with literature. The application also provides robust book management features, including deduplication, orphan scene recovery, and a user-friendly interface for library management and preference customization. The project emphasizes a modern web stack, scalability, and maintainability.

# User Preferences

I prefer iterative development, with small, focused changes. Please ask before making any major architectural changes or introducing new dependencies. I prefer clear and concise explanations for any complex logic or decisions.

This web app is mobile-first — designed primarily for Android users. The iOS version is a separate Expo/React Native project on Replit that shares the same API. All UI decisions should prioritize mobile viewport, touch targets, and mobile browser behavior (especially Android Chrome).

# System Architecture

The project is built as a pnpm workspace monorepo using TypeScript.

**Core Technologies:**
- **Monorepo:** pnpm workspaces
- **Backend:** Node.js 24, Express 5
- **Frontend:** React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, wouter, framer-motion, TanStack Query, Clerk
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod
- **API Codegen:** Orval (from OpenAPI spec)
- **AI Integration:** OpenAI (gpt-5.4, gpt-image-1) via Replit AI Integrations proxy

**UI/UX Decisions:**
- **Theme:** Dark cinematic theme with a palette of deep plums, oxbloods, dusty golds, and midnight blues. Uses Playfair Display (serif) and Plus Jakarta Sans for typography.
- **Components:** Leverages shadcn/ui (Radix) for UI components.
- **Branding:** Stylized rabbit head logo in an amber gradient, with "Jump *the* Book" wordmark.
- **Mobile-first Navigation:** Fixed bottom tab bar on mobile for core navigation (Now Reading, Bookshelf, Discover, Add). Top navigation is adapted for mobile, moving secondary elements into an avatar dropdown.

**Key Features:**
- **Book Management:**
    - EPUB parsing (browser-side with JSZip).
    - Server-side book deduplication and orphan scene recovery.
    - Comprehensive book editing, reading status tracking, and series awareness.
    - Smart Book Setup Wizard for adding and contextualizing books.
    - Dedicated "Now Reading" page and "Bookshelf" for library management with status filtering.
    - Unified "Add" page for book input via Smart Setup, cover snapping, search, or file upload.
    - Mobile-optimized UI for book tiles and reading statistics.
- **Scene Generation and Viewing:**
    - AI-powered scene generation using OpenAI models.
    - Scene image storage in App Storage and served via API.
    - Mobile authentication for seamless scene generation.
    - Image URLs are persisted even if the user navigates away during generation.
    - Two viewing modes: Comic (stacked panels) and Cinematic (full-screen with narration).
    - Per-book, per-chapter organization of generated scenes with search and "Play trailer" links.
- **User Authentication and Authorization:**
    - Clerk for authentication, authorization, and user management.
    - Onboarding wizard for new users.
    - Account page for managing user profiles, visual styles, reading preferences, and privacy settings (e.g., `shareToTrending` opt-in).
- **Content Enrichment:**
    - Open Library integration for book metadata and covers.
    - Voice capture for text input via Web Speech API.
    - AI-powered image-based inputs: "Snap the Page" (OCR) and "Snap a Cover" (title/author identification).
- **Data Layer and State Management:**
    - React Query for data fetching, caching, and synchronization.
    - `useLibrary()` hook provides auth-aware data access, using React Query for signed-in users and localStorage for signed-out users.
- **Image Generation Safety & Consistency:**
    - Character visual consistency maintained across scenes via persistent visual traits.
    - Safety suffix appended to all image prompts to ensure appropriate content.
    - Versioned image cache keys for consistency and uniqueness.
- **Anonymous Smart Setup & Shareable Scenes:**
    - Anonymous book setup wizard with localStorage persistence and post-signup claiming.
    - Shareable scenes via public API endpoints and meta tags for social media.
- **PWA / Offline Capabilities:**
    - Installable web app with `manifest.webmanifest`.
    - Service Worker for offline access to cached scene images and app shell.
- **Popularity Tracking & Trending:**
    - `hit_count` and `last_accessed_at` on cache tables for popularity tracking.
    - Public trending API to showcase top books, integrated into the "Discover" page.
- **Book Parsing Limits:**
    - EPUB and PDF parsers support full novels, with UI responsiveness managed through event loop yielding during EPUB parsing.

# External Dependencies

*   **OpenAI API:** For AI scene generation, OCR, and cover identification.
*   **Clerk:** For user authentication, authorization, and user management.
*   **PostgreSQL:** Relational database for application data.
*   **Drizzle ORM:** TypeScript ORM for PostgreSQL interaction.
*   **JSZip:** For browser-side EPUB parsing.
*   **Open Library API:** For fetching book metadata and cover images.
*   **Web Speech API:** For voice capture functionality.