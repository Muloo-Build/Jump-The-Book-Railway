# Jump the Book — App Store Connect Submission Pack

This file contains every text field App Store Connect will ask you for.
Copy each section into the corresponding field. Character limits noted in `()`.

---

## App Information

**App Name** (30 chars max)
```
Jump the Book
```

**Subtitle** (30 chars max)
```
Read chapters like a movie
```

**Bundle ID**
```
com.muloo.jumpthebook
```
(Confirm this matches `ios.bundleIdentifier` in `app.json` of the mobile repo.)

**Primary Category**
```
Books
```

**Secondary Category**
```
Entertainment
```

**Age Rating**
```
4+
```
Content rating answers: no violence, no profanity, no gambling, no user-generated
content shown unmoderated. (User-supplied book passages stay private to the
account that pasted them.)

---

## Promotional Text (170 chars — editable any time without re-review)
```
Turn any chapter into a cinematic trailer. AI illustrates the scenes you read,
in your favourite art style, without ever spoiling what comes next.
```

## Description (4000 chars max)
```
Jump the Book turns reading into a cinematic experience.

Paste a chapter, search any title, or pick from your library — and watch as
Jump the Book illustrates the scenes you're reading in the art style you love.
Comic book. Watercolour. Dark cinematic. Animated storybook. Manga. Fantasy
oil painting. Every chapter, brought to life.

SPOILER-SAFE BY DESIGN
Our AI is built around one rule: never spoil what's coming next. It describes
the atmosphere, mood, and setting of a scene — never the plot, the betrayals,
or the outcomes. Read ahead with confidence.

YOUR BOOK, YOUR BIBLE
Build a private "Book Bible" for any title — characters, locations, factions,
visual style notes, and the things you NEVER want spoiled. Jump the Book
grounds every generated scene in your bible, so what you see always matches
what you're reading.

WATCH YOUR CHAPTER AS A TRAILER
Hit play and Jump the Book turns your chapter into a fullscreen cinematic
sequence — narration, scene transitions, atmospheric music cues. Perfect for
audiobook listeners who want a visual companion, or for re-experiencing a
favourite chapter.

A LIBRARY THAT REMEMBERS
Your books, your reading position, your generated scenes — all synced across
your devices. Pick up where you left off, on any chapter, instantly.

PRIVATE BY DEFAULT
Your reading data is yours. We don't sell it, we don't share it, and the
passages you paste stay private to your account.

Designed for readers, built for chapter lovers.

—

KEY FEATURES
• Six AI art styles: comic, watercolour, dark cinematic, storybook, manga, fantasy
• Strict spoiler-safe scene generation
• Private Book Bible for personalised, accurate scenes
• Fullscreen cinematic chapter playback with narration
• Search 20M+ books via Open Library
• Works with pasted text, photo-snapped pages, or library books
• Cross-device sync via secure account
• No ads, no tracking, no spoilers
```

## Keywords (100 chars max, comma-separated, no spaces after commas)
```
book,reading,chapter,illustration,ai,scene,trailer,visual,reader,fantasy,novel,library,audiobook
```

## What's New in This Version (4000 chars max)
```
Welcome to Jump the Book.

This is our first release. Build your library, paste a chapter, and watch any
book come to life — spoiler-safe, in the visual style you love.

We'd love your feedback at hello@jumpthebook.app
```

## Support URL
```
https://jumpthebook.app/support
```

## Marketing URL (optional)
```
https://jumpthebook.app
```

## Privacy Policy URL (REQUIRED)
```
https://jumpthebook.app/privacy
```

---

## App Privacy ("Data Used to Track You" section)

**Data linked to user but NOT used for tracking:**
- Email address (account)
- Name (account, optional)
- User content: book metadata, reading position, generated scene cache,
  pasted passages
- Identifiers: User ID
- Diagnostics: Crash data, performance data

**Data NOT collected:**
- Location, contacts, browsing history, advertising data, financial info,
  health data, sensitive info, search history outside the app

**Tracking:** None.

---

## Sign-in Information for App Review

Reviewers must be able to sign in. Create a dedicated demo account before
submission and put credentials here:

```
Email: appreview@jumpthebook.app
Password: <set in App Store Connect, do NOT commit>
Notes:    Sign in with email/password via Clerk. The demo account
          already has 3 sample books in its library so reviewers can
          immediately tap "Generate scenes" on any chapter.
```

---

## Build & Submission Checklist

- [ ] App icon at 1024×1024 uploaded (`app-store/icon/icon-1024.png`)
- [ ] Screenshots uploaded for 6.9" iPhone (1320×2868) — at least 3, max 10
- [ ] Same screenshots also accepted as 6.7" (1290×2796) display
- [ ] Privacy policy live at the URL above
- [ ] Support page live at the URL above
- [ ] Demo account created and tested
- [ ] `expo.name = "Jump the Book"` in mobile repo `app.json`
- [ ] `expo.ios.bundleIdentifier = "com.muloo.jumpthebook"` in mobile repo
- [ ] EAS production build submitted: `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios` to push to App Store Connect

---

## Files in this pack

```
app-store/
├── APP_STORE_LISTING.md          ← this file
├── icon/
│   └── icon-1024.png             ← upload to App Store Connect "App Icon"
└── screenshots/
    ├── 01-hero.png               ← upload as screenshot 1
    ├── 02-styles.png             ← screenshot 2
    ├── 03-spoiler.png            ← screenshot 3
    ├── 04-trailer.png            ← screenshot 4
    └── 05-library.png            ← screenshot 5
```

The icon also needs to live in the **mobile repo** at
`assets/images/icon.png` (and `adaptive-icon.png` / `splash-icon.png` if you
want to keep them in lockstep). Copy it across, commit, and Expo will bake
it into your next EAS build.
