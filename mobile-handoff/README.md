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

The complete mobile design spec lives in `mobile-design-spec/` in the web project. Copy this folder into the mobile repo. The web app's actual theme is defined via CSS variables in `index.css` — the tokens below are the source of truth that both apps must match.

### 10.1 Color Palette (Source of Truth)

Both apps use the **exact same palette**. The web defines these as CSS custom properties (`--jtb-*`), the mobile design spec defines them in `tokens.ts`.

#### Ink Ramp (near-blacks with warm violet undertone)
| Token | Hex | Usage |
|-------|-----|-------|
| ink-950 | `#050507` | Deepest black (rare) |
| ink-900 | `#08080B` | **Page background** |
| ink-800 | `#0F1015` | Card background |
| ink-700 | `#16171E` | Elevated card / popover |
| ink-600 | `#1E1F28` | Hover / pressed |
| ink-500 | `#2A2B36` | Strong divider |
| ink-400 | `#3A3B47` | Divider |

#### Gold Ramp (antique brass — the only accent)
| Token | Hex | Usage |
|-------|-----|-------|
| gold-50 | `#FBF3DC` | — |
| gold-100 | `#F2E1B0` | — |
| gold-200 | `#E6C885` | **Highlight / italic emphasis** (`accentHi`) |
| gold-300 | `#D4B26B` | — |
| gold-400 | `#C9A96A` | **Primary accent** — buttons, eyebrows, CTAs |
| gold-500 | `#B0904D` | — |
| gold-600 | `#8E7339` | — |
| gold-700 | `#6B552A` | Faded accent edges (`accentLo`) |

#### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| paper | `#EDE6D3` | All body text on dark |
| text-dim | `#9D958A` | Secondary text |
| text-mute | `#6B6258` | Captions, placeholders |
| border | `rgba(201,169,106,0.10)` | All hairlines — **gold-tinted, never grey** |
| border-hi | `rgba(201,169,106,0.22)` | Hero borders, button outlines |
| accent-on | `#1A1208` | Text on gold buttons |
| danger | `#C9624A` | Destructive actions |
| success | `#6BA37A` | Success states |

### 10.2 Typography

Three font families — identical across web and mobile:

| Role | Font | Weight | Size | Line | LS | Color |
|------|------|--------|------|------|----|-------|
| Hero title | Cormorant Garamond | 500 | 32 | 34 | -0.5 | paper |
| Hero italic | Cormorant Garamond | 500i | 32 | 34 | -0.5 | gold-200 |
| Section heading | Cormorant Garamond | 500 | 18 | 22 | -0.2 | paper |
| Pull-quote | Cormorant Garamond | 500i | 18 | 24 | 0 | white |
| Reader body | Cormorant Garamond | 400 | 17 | 28 | 0 | paper |
| UI body | Inter | 400 | 13 | 19 | 0 | paper |
| Body strong | Inter | 600 | 13 | 19 | 0 | paper |
| Caption | Inter | 400 | 12 | 17 | 0 | text-mute |
| Button label | Inter | 600 | 13 | 13 | 0.1 | accent-on |
| **Eyebrow** | JetBrains Mono | 400 | 9.5-11 | 12 | 1.5 | accent (UPPERCASE) |
| Meta number | JetBrains Mono | 400 | 10 | 12 | 1 | text-mute |
| Tab label | Inter | 500 | 9 | 11 | 0.3 | accent / text-mute |

The **mono uppercase eyebrow** is the signature design element — used for `CH. 14 · SCENE 02`, `CONTINUE · 62%`, timestamps, status labels, etc. Never skip it.

### 10.3 Spacing, Radii, Shadows

**Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 (px/pt). Screen edge padding = 20.

**Border radius:**
| Token | Value |
|-------|-------|
| sm | 6px |
| md | 10px |
| lg | 14px |
| xl | 22px |
| pill | 999px |

**Shadows:**
```
Card:     0 8px 24px rgba(0,0,0,0.35) + 1px white inset highlight
Raised:   0 14px 40px rgba(0,0,0,0.5) + 1px white inset
Gold glow: 0 6px 30px rgba(201,169,106,0.18) + 1px gold ring
```

### 10.4 Web App CSS Utility Classes

The web app defines these `.jtb-*` classes. The mobile app should replicate equivalent styled components:

- **`.jtb-eyebrow`** — Mono 11px, letter-spacing 0.18em, uppercase, gold accent color
- **`.jtb-label`** — Mono 10px, letter-spacing 0.15em, uppercase, muted color
- **`.jtb-tag`** — Mono 9.5px pill with gold background (10% alpha) + gold border (18% alpha)
- **`.jtb-chip`** — Sans 11px pill, subtle border, hover/active states with gold highlight
- **`.jtb-card-accent`** — Card with gold-tinted border + subtle gold gradient background

### 10.5 Design Rules (What NOT to Do)
- **No bright amber.** Always antique brass `#C9A96A`, never `#fbbf24`
- **No system fonts.** Always Cormorant + Inter + JetBrains Mono
- **No neutral grey borders.** Always gold-tinted alpha borders
- **No second accent colour.** Gold is the only chromatic accent
- **No shadows on flat dark cards.** Use `shadows.card` only on raised cards
- **No light mode.** Dark only on mobile

### 10.6 Mobile Design Spec Files

Copy `mobile-design-spec/` into the mobile repo at `src/design/`:

```
tokens.ts               — colors, spacing, radius, shadows, typography (matches web tokens)
fonts.ts                — expo-font loader (Cormorant + Inter + JetBrains Mono)
Logo.tsx                — 4 logo marks (Crescent is the default, always use it)
DESIGN_SPEC.md          — full visual rules document

components/
  MobShell.tsx           — screen wrapper with header + tab bar
  ScreenBackground.tsx   — gradient background
  Header.tsx             — Crescent logo + wordmark left, icon buttons right
  Wordmark.tsx           — "Jump the Book" styled wordmark
  BottomTabBar.tsx       — Library / Scenes / Upload / Settings tabs
  Button.tsx             — primary | ghost | quiet x sm | md | lg
  IconButton.tsx         — 32x32 tap target, dark variant for over imagery
  Card.tsx               — dark surface + gold border + card shadow
  SectionHeading.tsx     — serif title left, mono CTA right
  Tag.tsx                — mono uppercase pill
  Chip.tsx               — filter chip for grids
  ProgressBar.tsx        — thin gold-gradient bar
  BookCover.tsx          — procedural gradient cover (placeholder until real cover loads)
  SceneArt.tsx           — procedural scene art placeholder (cinematic/comic/watercolour)

variants/ (drop-in complete screens)
  MobLibEditorial.tsx    — RECOMMENDED: magazine-style library with hero scene
  MobLibMinimal.tsx      — text-forward list for power readers
  MobLibCinematic.tsx    — streaming-app style, full-bleed swipeable hero
  MobLibSceneFirst.tsx   — Pinterest-style scene grid
  MobReadHero.tsx        — RECOMMENDED: scene image top, text scrolls under
  MobReadFilm.tsx        — vertical thumbnail rail alongside text
```

### 10.7 Bottom Tab Bar Navigation
| Tab | Icon | Purpose |
|-----|------|---------|
| Library | `Book` | User's bookshelf |
| Scenes | `Film` | Scene gallery |
| Upload | `Plus` | Add a book |
| Settings | `Settings` | Account & preferences |

---

## 11. Web App Page Layouts (What to Mirror)

The mobile app should replicate these screens. Each entry shows what data/API calls the screen uses and which components render it.

### 11.1 Home / Landing (`/`)
- Signed out: branding hero, "Start a shelf" + "I have an account" CTAs
- Signed in: redirects to `/library` (or `/onboarding` if not onboarded)

### 11.2 Library (`/library`)
- **Data:** `GET /me/books`, `GET /me/scenes`, `GET /me/bibles/summaries`, `GET /me/streak`
- **Sections (top to bottom):**
  1. **Welcome Hero** — greeting with time of day, subtitle based on reading state
  2. **Now Reading Hero** — pinned card for active book: cover image/gradient, chapter + scene labels, narration quote, progress bar, "Resume" + "All scenes" buttons
  3. **Reading Stats** — strip of stat cards: Currently reading, In library, Scenes generated, Streak, Time read
  4. **Add Another Book** — inline book search + Snap Cover + Upload + Guided Setup links
  5. **My Books** — grid of book tiles (`grid-cols-2 sm:3 md:4 lg:6`), each tile shows cover (hero > server cover > Open Library enrichment), title/author, progress bar, "Finished" badge, optional "Bible" badge
  6. **Scene Library** — collapsible per-book sections with scene tiles, search/filter, orphan recovery
  7. **Classics** — curated demo books grid

### 11.3 Discover (`/discover`)
- **Data:** `GET /trending` (public, no auth)
- **Sections:**
  1. **Hero** — "Find your *next* scene." with serif italic accent
  2. **Smart Setup card** — links to `/setup-book`
  3. **Upload card** — links to `/upload`
  4. **Popular Right Now** — trending books grid (`grid-cols-2 md:3 lg:4`):
     - Each card shows 4-image mosaic (2x2 grid from `sampleImages`) or single hero if < 4 images
     - Flame icon on top 3 books
     - Scene count + image count labels
     - Book title + author
     - Chapter count badge
     - Tapping links to `/setup-book?title=...&author=...` with pre-filled form

### 11.4 Book Detail (`/book/:id`)
- **Data:** `GET /me/books`, book bible, book scenes
- **Sections:** Cover hero, metadata (Open Library enrichment), chapter selector, "Generate scenes" button, "Add a bible" button, Reading Companion chat panel

### 11.5 Scene Generation (`/generate`)
- **Data:** `POST /scenes/generate`, `POST /scenes/image`
- **Flow:** Loading animation while AI generates, then renders scene cards one by one with images painting in

### 11.6 Comic View (`/comic/:id?chapter=N`)
- Stacked vertical panels: each scene shows image + narration + location/mood/characters metadata
- Share button per scene (builds shareable URL)

### 11.7 Cinematic View (`/experience/:id?chapter=N`)
- Full-screen scene image with overlay narration, swipe/tap between scenes
- Ken Burns slow zoom on images (scale 1.0 -> 1.08 over 8s)

### 11.8 Account (`/account`)
- **Data:** `GET /me`, `PATCH /me`
- **Sections:**
  1. Avatar picker — 10 bunny styles in a grid, instant save
  2. Reading Preferences card — visual styles (multi-select), spoiler mode, reading mode (auto-save, 600ms debounce)
  3. Reading Profile card — genres, platforms, pace, about me (auto-save, 800ms debounce)
  4. Clerk Profile & Security (embedded Clerk UI for email/password/Google)

### 11.9 Setup Book Wizard (`/setup-book`)
- 4-step wizard:
  1. Enter title + author (or pre-filled from URL params)
  2. AI generates bible draft via `POST /books/context/search`
  3. Review/edit bible (characters, locations, factions, tone, etc.)
  4. Save book + bible

---

## 12. Web App Component Library Reference

The web app has 30+ custom components. The mobile app should build equivalent React Native components:

### Layout & Navigation
| Component | Purpose |
|-----------|---------|
| `layout.tsx` | App shell: sticky header, nav bar (Library/Discover/Upload/Help), user dropdown, streak badge |
| `error-boundary.tsx` | App-wide crash handler |

### Hero & Dashboard
| Component | Purpose |
|-----------|---------|
| `welcome-hero.tsx` | Greeting + date pill + subtitle + CTA buttons |
| `now-reading-hero.tsx` | Active book card with cover, progress, narration quote, action buttons |
| `reading-stats.tsx` | Stats strip: books, scenes, streak, reading time |

### Book Tiles & Metadata
| Component | Purpose |
|-----------|---------|
| `library-book-tile.tsx` | Book card in grid: cover (3-tier fallback), title, progress bar, badges |
| `book-metadata.tsx` | Expandable "About this book" from Open Library: description + subject chips |
| `book-search.tsx` | Debounced Open Library search with "Add to library" per result |
| `cover-picker.tsx` / `cover-picker-dialog.tsx` | Choose/change book cover image |

### Scene Components
| Component | Purpose |
|-----------|---------|
| `scene-library.tsx` | Full scene gallery: search, per-book collapsible sections, scene tiles, orphan recovery |
| `paste-passage.tsx` | "Paste a passage" input to start scene generation |

### AI & Reading
| Component | Purpose |
|-----------|---------|
| `book-companion.tsx` | Reading companion chat: starter prompts, message history, AI responses |
| `bible-editor.tsx` | Rich form for editing book bible: characters, locations, factions, etc. |

### Input Helpers
| Component | Purpose |
|-----------|---------|
| `snap-cover-button.tsx` | Camera capture for book cover identification |
| `snap-page-button.tsx` | Camera capture for page OCR |
| `voice-capture-button.tsx` | Web Speech API dictation button |
| `streak-badge.tsx` | Flame icon + streak count in header |

### UI Primitives (shadcn/ui style)
The web uses 40+ shadcn/ui primitives (Button, Card, Dialog, Sheet, Tabs, Toast, etc.). The mobile app should use React Native equivalents — the `mobile-design-spec/components/` already provides the core ones (Button, Card, Tag, Chip) with the correct styling.

---

## 13. Image Handling

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

## 14. Open Library Integration

Both apps use Open Library for book covers and metadata:
- Search: `https://openlibrary.org/search.json?q=<query>&limit=12`
- Cover images: `https://covers.openlibrary.org/b/id/<coverId>-L.jpg`
- Work details: `https://openlibrary.org<workKey>.json`

The shared library (`@workspace/jump-the-book-shared/openLibrary`) provides helper functions for this. The mobile app can import them directly or reimplement them.

---

## 15. PWA / Offline Considerations

The web app has a service worker that caches scene images for offline viewing (`jtb-scenes-v1` cache). The mobile app should implement equivalent offline support:
- Cache viewed scene images locally
- Cache the book library for offline browsing
- Queue scene generation requests when offline

---

## 16. Live Features — Trending / Popularity Tracking

The trending system is **already live** on the web app. The mobile app should implement it.

### How It Works
Scene and image caches track `hit_count` and `last_accessed_at` per book. When any user generates scenes or images for a book, those counters increment. The `/api/trending` endpoint aggregates them into a ranked list.

### TrendingBook Interface
```ts
interface TrendingBook {
  bookTitle: string;
  author: string;
  totalSceneHits: number;       // total scene generation requests
  totalImageHits: number;       // total image generation requests
  totalHits: number;            // scene + image combined
  uniqueChapters: number;       // how many chapters have been explored
  sceneCount: number;           // total cached scene entries
  imageCount: number;           // total cached image entries
  sampleImages: string[];       // up to 4 image URLs for the mosaic
  lastAccessedAt: string;       // ISO timestamp of last activity
}
```

### API Endpoint
```
GET /trending
Response: { "books": TrendingBook[], "totalBooks": number }
```
- Public (no auth required)
- Returns top 20 books sorted by `totalHits DESC`, then `sceneCount DESC`
- `sampleImages` are `/api/storage/objects/scene-images/<uuid>` URLs

### Web App "Popular Right Now" Layout
The Discover page renders this as a grid of `TrendingBookCard` components:
- **Grid:** 2 columns mobile, 3 tablet, 4 desktop
- **Each card contains:**
  1. **Image mosaic** — if 4+ sample images: 2x2 grid layout (rounded corners, 1px gap). If fewer: single hero image
  2. **Flame badge** — top 3 books get a flame icon overlay (top-left)
  3. **Stats line** — `"{sceneCount} scenes · {imageCount} images"` in mono eyebrow style
  4. **Title** — serif font, 1-2 lines
  5. **Author** — sans dimmed text
  6. **Chapter badge** — if `uniqueChapters > 1`: `"{uniqueChapters} chapters"` chip
- **Tap action:** Opens Smart Setup with `?title=...&author=...` pre-filled
- **Loading state:** Skeleton grid (pulsing placeholder cards)

### Mobile Implementation Notes
- Call `GET /trending` on the Discover/Explore tab
- Display as a scrollable grid or list
- Use the `sampleImages` array for the mosaic (prefix with API base URL)
- Tapping a trending book should navigate to the "Add Book" flow with title+author pre-filled
- Refresh on pull-to-refresh, stale time ~5 minutes

---

## 17. What's Coming (Planned Features)

These features are being built for the web app. The mobile app should plan for them:

1. **Reading status tags:** Each book gets a `readingStatus` field: `"reading"`, `"want-to-read"`, or `"finished"` — new column on `user_books`, filterable via `GET /me/books`
2. **Series grouping:** `seriesName` and `seriesOrder` fields — books in the same series visually grouped
3. **Reading stats dashboard:** Charts showing reading activity, streak history, genre breakdown
4. **Open Library editions API:** Better series detection using OL editions endpoint

These will add new columns to `user_books` and new query params to `GET /me/books`. The API contract will be backward-compatible.

---

## 18. Environment Setup for Mobile

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
