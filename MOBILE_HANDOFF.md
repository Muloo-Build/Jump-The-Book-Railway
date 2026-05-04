# Jump the Book — Mobile App Handoff Document

Complete reference for building the Expo/React Native mobile app that mirrors the web app. Both apps share the same API server, database, Clerk auth, and user profile — a user signed in on either app sees the same library, scenes, and preferences.

---

## 1. Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│   Web App (Vite)    │     │  Mobile App (Expo)   │
│  React 19 + wouter  │     │  React Native + RN   │
│  @clerk/react       │     │  @clerk/expo         │
└────────┬────────────┘     └────────┬─────────────┘
         │                           │
         │  Authorization: Bearer <token>
         │  Content-Type: application/json
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────────┐
│              API Server (Express 5)             │
│         Node.js 24 · @clerk/express             │
│     PostgreSQL (Drizzle ORM) · OpenAI AI        │
│         Object Storage (scene images)           │
└─────────────────────────────────────────────────┘
```

**Key principle:** The API is the single source of truth. Both apps are thin clients that call the same REST endpoints with Clerk Bearer tokens. Profile, library, scenes, bibles — everything syncs automatically because it's all server-side.

---

## 2. Authentication

### Provider: Clerk
- Web uses `@clerk/react`
- Mobile should use `@clerk/expo`
- Both authenticate against the **same Clerk application** (same publishable key + secret key)

### How the API validates auth
- Every request passes through `clerkMiddleware()` (Express middleware from `@clerk/express`)
- Protected routes use `requireAuth` middleware which calls `getAuth(req).userId`
- If no valid session, returns `401 Unauthorized`

### What the mobile app needs to send
```
Authorization: Bearer <clerk-session-token>
Content-Type: application/json
```

Get the token in Expo via:
```tsx
import { useAuth } from "@clerk/expo";
const { getToken } = useAuth();
const token = await getToken();
```

### Clerk Proxy (Production)
In production, the API server proxies Clerk requests through `/api/__clerk` to avoid CORS issues with Clerk's domain. The mobile app may need to configure its Clerk provider with the proxy URL:
```
proxyUrl: "https://<your-deployed-domain>/api/__clerk"
```

### CORS
The API allows origins listed in `REPLIT_DOMAINS` environment variable. Mobile app requests (from native, not a browser) typically bypass CORS, but if using a web view, ensure the domain is listed.

---

## 3. API Base URL

- **Development:** The API runs on the same Replit domain as the web app, under the `/api` path prefix
- **Production:** Will be `https://<deployed-domain>/api`
- All endpoints below are relative to `/api`

---

## 4. Complete API Reference

### 4.1 Public Endpoints (No Auth Required)

#### Health Check
```
GET /healthz
Response: { "status": "ok" }
```

#### Trending Books
```
GET /trending
Response: {
  "books": [{
    "bookTitle": string,
    "author": string,
    "totalSceneHits": number,
    "totalImageHits": number,
    "totalHits": number,
    "uniqueChapters": number,
    "sceneCount": number,
    "imageCount": number,
    "sampleImages": string[],      // URLs like "/api/storage/objects/scene-images/<uuid>"
    "lastAccessedAt": string       // ISO timestamp
  }],
  "totalBooks": number
}
```

#### Scene Share (OG Meta Page)
```
GET /share/scene?title=...&narration=...&img=...&mood=...&location=...
Response: HTML page with OG meta tags, redirects to SPA /scene-share
```

#### Book Bible Draft Generation
```
POST /books/context/search
Body: {
  "title": string,        // required
  "author": string,       // required
  "series": string,       // optional
  "bookNumber": number    // optional
}
Response: { "draft": BibleDraft }
```
See Section 8 for the full `BibleDraft` shape.

#### Storage / Image Serving
```
GET /storage/objects/scene-images/<uuid>
Response: PNG image binary (streamed)

GET /storage/public-objects/<filePath>
Response: File binary (streamed)
```

### 4.2 Auth-Required Endpoints

#### User Profile

**Get profile:**
```
GET /me
Response: {
  "userId": string,
  "avatarId": string | null,           // bunny avatar ID (e.g. "cute", "scifi")
  "defaultVisualStyle": VisualStyle,
  "defaultVisualStyles": VisualStyle[],
  "spoilerMode": SpoilerMode,
  "readingMode": "reading" | "listening" | "both",
  "favoriteGenres": string[],
  "readingPlatforms": string[],
  "readingPace": "slow" | "steady" | "voracious" | null,
  "aboutMe": string,
  "onboarded": boolean,
  "onboardedAt": string | null
}
```

**Update profile:**
```
PATCH /me
Body: (all fields optional)
{
  "avatarId": string | null,
  "defaultVisualStyle": VisualStyle,
  "defaultVisualStyles": VisualStyle[],
  "spoilerMode": SpoilerMode,
  "readingMode": "reading" | "listening" | "both",
  "favoriteGenres": string[],          // max 12 items, 60 chars each
  "readingPlatforms": string[],        // max 8 items, 60 chars each
  "readingPace": "slow" | "steady" | "voracious" | null,
  "aboutMe": string,                   // max 600 chars
  "markOnboarded": boolean             // set true to mark onboarding complete
}
Response: same shape as GET /me
```

**Reading streak:**
```
GET /me/streak
Response: {
  "currentStreak": number,
  "longestStreak": number,
  "activeToday": boolean,
  "lastActiveDate": string | null
}
```

#### Books (Library)

**List all books:**
```
GET /me/books
Response: { "books": RemoteBook[] }
```
Books are returned ordered by `updatedAt DESC`.

**Add a book:**
```
POST /me/books
Body: {
  "title": string,                // required
  "author": string,               // required
  "source": "demo" | "upload" | "manual",  // required
  "visualStyle": VisualStyle,     // required
  "spoilerMode": SpoilerMode,     // required
  "format": string,               // default "Paperback"
  "demoBookId": string | null,
  "coverGradient": string[],
  "currentChapter": number,
  "currentPage": number,
  "currentAudioTimestamp": string,
  "progress": number,
  "userNote": string,
  "tagline": string | null,
  "heroImage": string | null,
  "coverUrl": string | null,
  "totalChapters": number | null
}
Response (201): { "book": RemoteBook }
Response (200, deduped): { "book": RemoteBook, "deduped": true }
```
Dedup logic: matches on `(userId, demoBookId)` or `(userId, lower(trim(title)), lower(trim(author)))`.

**Update a book:**
```
PATCH /me/books/:id
Body: (all optional)
{
  "title", "author", "format",
  "currentChapter", "currentPage", "currentAudioTimestamp",
  "progress",                     // 0-100
  "userNote", "visualStyle", "spoilerMode",
  "totalChapters", "tagline", "heroImage", "coverUrl", "coverGradient"
}
Response: { "book": RemoteBook }
```

**Delete a single book:**
```
DELETE /me/books/:id
Response: { "ok": true }
```

**Delete all books:**
```
DELETE /me/books
Response: { "ok": true, "deleted": number }
```

#### Scenes

**List scenes for a book:**
```
GET /me/books/:id/scenes
Response: { "scenes": RemoteScene[] }
```
Ordered by `(chapterNumber ASC, sceneIndex ASC)`.

**List all user scenes (up to 200 most recent):**
```
GET /me/scenes
Response: { "scenes": RemoteScene[] }
```

**Save/upsert a scene:**
```
POST /me/books/:id/scenes
Body: {
  "chapterNumber": number,        // required
  "sceneIndex": number,           // required
  "title": string,                // required
  "summary": string,
  "narration": string,
  "location": string,
  "mood": string,
  "characters": string[],
  "gradientColors": string[],
  "imagePrompt": string,
  "imageUrl": string | null,
  "visualStyle": string,
  "sceneCacheKey": string | null,
  "imageCacheKey": string | null
}
Response: { "scene": RemoteScene }
```
Upserts on `(userBookId, chapterNumber, sceneIndex)`.

**Delete a scene:**
```
DELETE /me/scenes/:id
Response: { "ok": true, "userBookId": string }
```

#### AI Scene Generation

**Generate scenes for a chapter:**
```
POST /scenes/generate
Body: {
  "bookTitle": string,            // required
  "author": string,               // required
  "chapterTitle": string,         // required
  "chapterNumber": number,        // required
  "visualStyle": VisualStyle,     // default "fantasy-illustration"
  "spoilerMode": SpoilerMode,     // default "no-spoilers"
  "excerpt": string,              // the chapter text
  "generateImage": boolean,       // default false; if true, generates image for scene 0
  "sceneCount": number,           // 1-5
  "bookBibleId": string,          // UUID of the user's bible for this book
  "whatJustHappened": string,     // context from previous chapter
  "currentSceneCharacters": string[]
}
Response: {
  "scenes": [{
    "title": string,
    "summary": string,
    "narration": string,
    "location": string,
    "mood": string,
    "characters": string[],
    "gradientColors": string[],
    "imagePrompt": string,
    "imageCacheKey": string,
    "imageUrl": string | null,
    "imageGeneratedAt": string | null
  }],
  "cacheKey": string,
  "cached": boolean,
  "sceneCacheVersion": number,
  "imageCacheVersion": number,
  "imageUrl": string | null       // first scene image (if generateImage=true and not cached)
}
```

**Generate a single scene image:**
```
POST /scenes/image
Body: {
  "prompt": string,               // required (the imagePrompt from scene generation)
  "style": VisualStyle,           // default "fantasy-illustration"
  "bookTitle": string,            // required
  "author": string,               // required
  "chapterNumber": number,        // required
  "sceneIndex": number,           // required
  "cacheKey": string,             // optional client hint (server recomputes)
  "sceneCharacters": string[],    // for consistency signatures
  "bookBibleId": string           // for bible-driven character enrichment
}
Response: {
  "imageUrl": string,             // e.g. "/api/storage/objects/scene-images/<uuid>"
  "cacheKey": string,
  "cached": boolean
}
```

#### Book Bibles

**Get bible summaries (lightweight, for library rendering):**
```
GET /me/bibles/summaries
Response: {
  "summaries": [{
    "userBookId": string,
    "contextVersion": number,
    "series": string | null,
    "genre": string[],
    "characterCount": number,
    "updatedAt": string
  }]
}
```

**Get bible for a specific book:**
```
GET /me/books/:bookId/bible
Response: { "bible": BookBible | null }
```

**Create/update bible:**
```
PUT /me/books/:bookId/bible
Body: {
  "draft": BibleDraft,           // required (see Section 8)
  "userNotes": string,
  "focusAreas": string[],
  "avoidNotes": string
}
Response: { "bible": BookBible }
```

#### Reading Companion Chat

```
POST /me/books/:bookId/companion
Body: {
  "question": string,            // required
  "history": [                    // optional conversation history
    { "role": "user" | "assistant", "content": string }
  ]
}
Response: { "answer": string }
```
Uses the book's bible for spoiler-safe context. Returns AI-generated answer.

#### Orphan Scene Recovery

**List orphan scene groups:**
```
GET /me/orphan-scenes
Response: {
  "groups": [{
    "userBookId": string,
    "sceneCount": number,
    "latestCreatedAt": string
  }]
}
```

**Claim orphan scenes (create book + repoint scenes):**
```
POST /me/orphan-scenes/claim
Body: {
  "userBookId": string,
  "title": string,
  "author": string,
  "visualStyle": VisualStyle,
  "spoilerMode": SpoilerMode,
  "tagline": string | null,
  "heroImage": string | null
}
Response: { "book": RemoteBook, "movedSceneCount": number, "droppedDuplicateCount": number }
```

**Delete orphan scenes:**
```
DELETE /me/orphan-scenes/:userBookId
Response: { "ok": true, "removedSceneCount": number }
```

#### OCR & Cover Identification

**Extract text from a page photo:**
```
POST /passage/ocr
Body: { "dataUrl": string }       // base64 data URL of the image
Response: { "text": string }
```

**Identify book from cover photo:**
```
POST /books/cover/identify
Body: { "dataUrl": string }       // base64 data URL of the cover image
Response: {
  "title": string,
  "author": string,
  "confidence": number,           // 0-1; below ~0.55 warn the user
  "note": string                  // optional model commentary
}
```

---

## 5. Data Types

### VisualStyle
```ts
type VisualStyle =
  | "comic-book"
  | "watercolour"
  | "dark-cinematic"
  | "animated-storybook"
  | "manga-inspired"
  | "fantasy-illustration";  // default
```

### SpoilerMode
```ts
type SpoilerMode =
  | "no-spoilers"           // default
  | "light-guidance"
  | "full-companion";
```

### RemoteBook
```ts
interface RemoteBook {
  id: string;                         // UUID
  title: string;
  author: string;
  format: string;                     // "Paperback", "Kindle", etc.
  source: "demo" | "upload" | "manual";
  demoBookId: string | null;          // slug for demo books (e.g. "alice")
  coverGradient: string[];            // hex colors for procedural cover
  visualStyle: VisualStyle;
  spoilerMode: SpoilerMode;
  currentChapter: number;             // 1-based
  currentPage: number;
  currentAudioTimestamp: string;       // "HH:MM:SS"
  progress: number;                   // 0-100
  userNote: string;
  tagline: string | null;
  heroImage: string | null;           // uploaded cover image path
  coverUrl: string | null;            // resolved Open Library / CDN cover URL
  totalChapters: number | null;
  createdAt: string;                  // ISO timestamp
  updatedAt: string;                  // ISO timestamp
}
```

### RemoteScene
```ts
interface RemoteScene {
  id: string;                         // UUID
  userBookId: string;                 // FK to RemoteBook.id
  chapterNumber: number;
  sceneIndex: number;                 // 0-based within a chapter
  title: string;
  summary: string | null;
  narration: string | null;           // cinematic narration text
  location: string | null;
  mood: string | null;
  characters: string[];
  gradientColors: string[];           // hex colors for scene card background
  imagePrompt: string | null;
  imageUrl: string | null;            // relative URL to scene image
  visualStyle: string | null;
  createdAt: string;                  // ISO timestamp
}
```

### RemoteUser
```ts
interface RemoteUser {
  userId: string;
  avatarId: string | null;            // bunny avatar ID
  defaultVisualStyle: VisualStyle;
  defaultVisualStyles: VisualStyle[]; // multi-select pool
  spoilerMode: SpoilerMode;
  readingMode: "reading" | "listening" | "both";
  favoriteGenres: string[];
  readingPlatforms: string[];
  readingPace: "slow" | "steady" | "voracious" | null;
  aboutMe: string;
  onboarded: boolean;
  onboardedAt: string | null;
}
```

---

## 6. Database Schema

The mobile app doesn't access the database directly — everything goes through the API. But for reference, here are all 6 core tables:

### app_users
User profile and preferences. One row per Clerk user.
| Column | Type | Notes |
|--------|------|-------|
| user_id | text PK | Clerk user ID |
| email | text | nullable |
| avatar_id | text | nullable, bunny avatar slug |
| default_visual_style | text | default "fantasy-illustration" |
| default_visual_styles | jsonb | default [] |
| spoiler_mode | text | default "no-spoilers" |
| reading_mode | text | default "reading" |
| favorite_genres | jsonb | default [] |
| reading_platforms | jsonb | default [] |
| reading_pace | text | nullable |
| about_me | text | default "" |
| onboarded_at | timestamptz | nullable |
| created_at / updated_at | timestamptz | |

### user_books
Personal library. One row per book per user.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | text FK->app_users | CASCADE delete |
| title, author | text | required |
| format | text | default "Paperback" |
| source | text | "demo", "upload", "manual" |
| demo_book_id | text | nullable, unique per user |
| cover_gradient | jsonb | hex color array |
| visual_style, spoiler_mode | text | |
| current_chapter | int | default 1 |
| current_page | int | default 0 |
| current_audio_timestamp | text | default "00:00:00" |
| progress | int | 0-100 |
| user_note | text | |
| tagline, hero_image, cover_url | text | nullable |
| total_chapters | int | nullable |
| created_at / updated_at | timestamptz | |

**Indexes:** `(user_id)`, unique `(user_id, demo_book_id)`

### user_scenes
Generated scene cards saved to a user's library.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | text FK->app_users | CASCADE |
| user_book_id | uuid FK->user_books | CASCADE |
| chapter_number | int | |
| scene_index | int | 0-based |
| title | text | |
| summary, narration, location, mood | text | nullable |
| characters | jsonb | string array |
| gradient_colors | jsonb | hex array |
| image_prompt | text | nullable |
| image_url | text | nullable |
| visual_style | text | nullable |
| scene_cache_key, image_cache_key | text | nullable |
| created_at | timestamptz | |

**Indexes:** `(user_id)`, `(user_book_id, chapter_number)`, unique `(user_book_id, chapter_number, scene_index)`

### book_bibles
AI-generated book context for spoiler-safe scene generation.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_book_id | uuid FK->user_books | unique, CASCADE |
| user_id | text FK->app_users | CASCADE |
| context_version | int | increments on update |
| series | text | nullable |
| book_number | int | nullable |
| genre, tone | jsonb | string arrays |
| setting_summary | text | |
| visual_style_hints | jsonb | string array |
| non_spoiler_summary, publisher_blurb | text | |
| factions, locations, species, ships, technology, important_objects | jsonb | NamedEntity arrays |
| character_profiles | jsonb | CharacterProfile array |
| sources | jsonb | SourceRef array |
| user_notes | text | |
| focus_areas | jsonb | string array |
| avoid_notes | text | |
| created_at / updated_at | timestamptz | |

### scene_cache & image_cache
Shared caches (cross-user). Powers the trending feature.
| Table | PK | Notable Columns |
|-------|-----|----------------|
| scene_cache | cache_key | book_title, author, chapter, scenes (jsonb), hit_count, last_accessed_at |
| image_cache | cache_key | book_title, author, chapter, scene_index, object_path, hit_count, last_accessed_at |

---

## 7. Shared Code Library

The `lib/jump-the-book-shared` package exports types and utilities that both apps should use:

```ts
// Types
import type {
  VisualStyle,
  SpoilerMode,
  RemoteUser,
  RemoteBook,
  RemoteScene,
  AddBookInput,
  UserLibraryItem,
  CoverIdentifyResult
} from "@workspace/jump-the-book-shared/types";

// Labels for UI
import {
  VISUAL_STYLE_LABELS,
  SPOILER_MODE_LABELS,
  remoteBookToUserLibraryItem
} from "@workspace/jump-the-book-shared/types";

// Open Library helpers
import {
  searchOpenLibrary,
  fetchWorkDetails,
  searchAndFetchWork
} from "@workspace/jump-the-book-shared/openLibrary";
```

**Important:** The shared `RemoteUser` type is currently missing some fields that the web app uses. The full set (as returned by `GET /me`) is documented in Section 5 above. The shared type needs to be updated to include: `avatarId`, `defaultVisualStyles`, `favoriteGenres`, `readingPlatforms`, `readingPace`, `aboutMe`.

---

## 8. Bible Draft Shape

The full structure returned by `POST /books/context/search` and accepted by `PUT /me/books/:bookId/bible`:

```ts
interface CharacterProfile {
  name: string;
  role: string;              // e.g. "protagonist", "antagonist", "supporting"
  description: string;       // non-spoiler character description
  visualTraits: string[];    // physical appearance for image consistency
  aliases: string[];
}

interface NamedEntity {
  name: string;
  description: string;
}

interface SourceRef {
  title: string;
  url: string;
  type: string;              // e.g. "wikipedia", "goodreads"
}

interface BibleDraft {
  series: string | null;
  bookNumber: number | null;
  genre: string[];
  tone: string[];
  settingSummary: string;
  visualStyleHints: string[];
  nonSpoilerSummary: string;
  publisherBlurb: string;
  factions: NamedEntity[];
  locations: NamedEntity[];
  species: NamedEntity[];
  ships: NamedEntity[];
  technology: NamedEntity[];
  importantObjects: NamedEntity[];
  characterProfiles: CharacterProfile[];
  sources: SourceRef[];
}
```

---

## 9. User Flows to Replicate

### 9.1 Onboarding (3 steps)
1. Pick visual style(s) — sets `defaultVisualStyle` + `defaultVisualStyles`
2. Choose spoiler mode — sets `spoilerMode`
3. Optionally add first book — redirects to setup wizard or library
4. Call `PATCH /me { markOnboarded: true }` to complete

### 9.2 Adding a Book

**Smart Setup (recommended):**
1. User enters title + author
2. Call `POST /books/context/search` to generate bible draft
3. User reviews/edits the bible
4. Call `POST /me/books` to create the book
5. Call `PUT /me/books/:bookId/bible` to save the bible
6. Redirect to book detail

**Upload (EPUB/PDF):**
1. Parse file client-side (chapters + metadata)
2. Call `POST /me/books` with extracted metadata
3. Optionally generate bible via Smart Setup flow

**Snap a Cover:**
1. Take photo, convert to data URL
2. Call `POST /books/cover/identify` -> get title + author
3. Search Open Library for cover image
4. Proceed to Smart Setup or direct add

### 9.3 Generating Scenes
1. User selects a book and chapter
2. Provide chapter text as `excerpt`
3. Call `POST /scenes/generate` with `generateImage: true`
4. Receive scene cards with text, narration, mood, characters, gradient colors
5. First scene may have an inline image; for remaining scenes call `POST /scenes/image` per scene
6. Save each scene via `POST /me/books/:id/scenes`

### 9.4 Viewing Scenes
Two modes the mobile app should support:
- **Comic mode:** Stacked panels showing scene image + narration + metadata
- **Cinematic mode:** Full-screen scene image with narration overlay, swipe between scenes

### 9.5 Profile Management
- Avatar picker: 10 bunny styles (`cute`, `scifi`, `steampunk`, `noir`, `fantasy`, `cyberpunk`, `nature`, `galaxy`, `vintage`, `warrior`) — saved via `PATCH /me { avatarId }`
- Reading preferences: visual styles, spoiler mode, reading mode — auto-save via `PATCH /me`
- Reading profile: genres, platforms, pace, about me — auto-save via `PATCH /me`

### 9.6 Reading Companion Chat
1. User opens companion for a book
2. Call `POST /me/books/:bookId/companion` with question
3. Display AI response (spoiler-safe, uses book's bible as context)
4. Maintain conversation history client-side, send with each request

---

## 10. Design System

The complete design spec lives in `mobile-design-spec/` in the web project. Copy this folder into the mobile repo.

### Quick Summary
- **Dark mode only.** Background: `#08080B`
- **One accent:** Antique brass gold `#C9A96A` (NOT bright amber)
- **Three fonts:** Cormorant Garamond (serif), Inter (sans), JetBrains Mono (mono)
- **Signature element:** Mono uppercase eyebrows (e.g. `CH. 14 · SCENE 02`)
- **Gold-tinted borders:** `rgba(201,169,106,0.10)` — never neutral grey
- **Icons:** lucide-react-native, stroke width 1.4

### What's in `mobile-design-spec/`
```
tokens.ts               — colors, spacing, radius, shadows, typography
fonts.ts                — expo-font loader
Logo.tsx                — 4 logo marks (Crescent is default)
DESIGN_SPEC.md          — full visual rules

components/
  MobShell.tsx           — screen wrapper (header + tab bar)
  Header.tsx, BottomTabBar.tsx
  Button.tsx             — primary | ghost | quiet x sm | md | lg
  Card.tsx, Tag.tsx, Chip.tsx
  BookCover.tsx          — procedural gradient cover placeholder
  SceneArt.tsx           — procedural scene art placeholder
  ProgressBar.tsx
  + more

variants/
  MobLibEditorial.tsx    — recommended library layout
  MobLibMinimal.tsx, MobLibCinematic.tsx, MobLibSceneFirst.tsx
  MobReadHero.tsx        — recommended reading/scene layout
  MobReadFilm.tsx
```

### Recommended Variants
- **Library:** `MobLibEditorial` (magazine-style with hero scene)
- **Reading/Scene viewer:** `MobReadHero` (scene image up top, text scrolls under)

### Bottom Tab Bar Navigation
The design spec defines 4 tabs:
- **Library** — user's bookshelf
- **Scenes** — scene gallery
- **Upload** — add a book
- **Settings** — account & preferences

---

## 11. Image Handling

Scene images are stored in the API server's object storage and served at:
```
/api/storage/objects/scene-images/<uuid>
```

These are relative URLs. In the mobile app, prefix with the API base URL:
```
https://<deployed-domain>/api/storage/objects/scene-images/<uuid>
```

Image URLs returned by the scene generation endpoints are already in this format. Display them directly in `<Image>` components with the auth token if needed (though image serving is currently public).

---

## 12. Open Library Integration

Both apps use Open Library for book covers and metadata:
- Search: `https://openlibrary.org/search.json?q=<query>&limit=12`
- Cover images: `https://covers.openlibrary.org/b/id/<coverId>-L.jpg`
- Work details: `https://openlibrary.org<workKey>.json`

The shared library (`@workspace/jump-the-book-shared/openLibrary`) provides helper functions for this. The mobile app can import them directly or reimplement them.

---

## 13. PWA / Offline Considerations

The web app has a service worker that caches scene images for offline viewing (`jtb-scenes-v1` cache). The mobile app should implement equivalent offline support:
- Cache viewed scene images locally
- Cache the book library for offline browsing
- Queue scene generation requests when offline

---

## 14. What's Coming (Task #9)

The web app is about to add these features. The mobile app should plan for them:

1. **Reading status tags:** Each book will get a `readingStatus` field: `"reading"`, `"want-to-read"`, or `"finished"`
2. **Series support:** `seriesName` and `seriesOrder` fields on books
3. **Now Reading page:** Dedicated view for actively-read books
4. **Bookshelf reorganization:** Books organized by reading status

These will add new columns to `user_books` and new query params to `GET /me/books`. The API contract will be backward-compatible.

---

## 15. Environment Setup for Mobile

### Required Clerk Config
The mobile app needs the same Clerk application credentials:
- `CLERK_PUBLISHABLE_KEY` — same key used by the web app
- In production, set `proxyUrl` to `https://<deployed-domain>/api/__clerk`

### API Connection
```ts
const API_BASE = __DEV__
  ? "https://<replit-dev-domain>/api"
  : "https://<production-domain>/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken(); // from @clerk/expo
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
```

### Packages to Install
```bash
npx expo install \
  @clerk/expo \
  @tanstack/react-query \
  expo-font expo-linear-gradient expo-secure-store \
  react-native-svg \
  lucide-react-native \
  @expo-google-fonts/cormorant-garamond \
  @expo-google-fonts/inter \
  @expo-google-fonts/jetbrains-mono
```
