# Jump the Book — Mobile

Expo (React Native) client for **Jump the Book**. Talks to the public web + API server (deployed separately) at `https://$EXPO_PUBLIC_DOMAIN/api`.

## Quick start

```bash
pnpm install            # or: npm install / yarn
cp .env.example .env    # fill in EXPO_PUBLIC_DOMAIN and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
pnpm start              # opens the Expo dev menu
```

Use the Expo Go app (iOS / Android) to scan the QR code, or press `i` / `a` to launch a simulator.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_DOMAIN` | Domain (no protocol) of your deployed web + API server. The app calls `https://${EXPO_PUBLIC_DOMAIN}/api/*` and proxies Clerk through `https://${EXPO_PUBLIC_DOMAIN}/api/__clerk`. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Same Clerk publishable key as the web app. |

For production builds, also set `EXPO_PUBLIC_REPL_ID` if your deployment uses Replit-style host headers; otherwise `scripts/build.js` will derive defaults.

## How it relates to the web + API repo

This repo is **mobile only**. The Express API and the React/Vite web app live in a separate repo and are deployed together at `EXPO_PUBLIC_DOMAIN`. This app is a pure consumer — it never reaches into the database directly.

The two formerly-shared libraries are vendored into `vendor/`:

- `vendor/api-client-react` — generated React Query hooks + `customFetch` / `setBaseUrl` / `setAuthTokenGetter`. If you regenerate this in the API repo from the OpenAPI spec, copy the new `src/generated/*` files here.
- `vendor/jump-the-book-shared` — `RemoteUser`, `RemoteBook`, `RemoteScene`, `VisualStyle`, `SpoilerMode`, `searchOpenLibrary`, `remoteBookToUserLibraryItem`, etc. Keep this in lockstep with the same folder in the API/web repo.

The TypeScript path aliases in `tsconfig.json` keep the existing `@workspace/api-client-react` and `@workspace/jump-the-book-shared` imports working unchanged.

## Project layout

```
app/             expo-router screens (tabs + modals + deep links)
components/      UI components (NowReadingHero, ScenesSection, …)
context/         React contexts (LibraryContext)
hooks/           useRemoteLibrary, useBookBible, useGenerateScene, …
data/            Demo book catalog
assets/          Fonts and images
vendor/          Vendored copies of the shared libraries (see above)
scripts/build.js Production build helper
server/serve.js  Tiny static server for the web export
```

## Building for production

```bash
EXPO_PUBLIC_DOMAIN=your-api.example.com \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
pnpm build
```

For TestFlight / Play Store builds, use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas build --platform ios
npx eas build --platform android
```
