# Splitting this folder out into its own GitHub repo

This folder (`mobile-export/`) is **already a complete, standalone Expo app** — it has no dependency on the rest of this monorepo. Follow these steps to turn it into a real, separate GitHub repository.

## 1. Create an empty GitHub repo

Go to <https://github.com/new>, name it something like `jump-the-book-mobile`, and **don't** add a README, .gitignore, or license (this folder already has them).

## 2. Push this folder to it

From the project root (in this Replit shell, or on your local machine after cloning this Replit):

```bash
cd mobile-export

# Initialise the new repo, commit, and push
git init -b main
git add .
git commit -m "Initial mobile app split from monorepo"
git remote add origin git@github.com:<your-username>/jump-the-book-mobile.git
git push -u origin main
```

(If you prefer HTTPS, use `https://github.com/<your-username>/jump-the-book-mobile.git`.)

## 3. Configure environment variables

In the new repo, copy `.env.example` to `.env` and fill in:

- `EXPO_PUBLIC_DOMAIN` — the public domain where your **web + API** repo is deployed (e.g. `jumpthebook-yourname.replit.app`). The mobile app will hit `https://${EXPO_PUBLIC_DOMAIN}/api/*`.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — the same Clerk publishable key the web app uses.

## 4. Install and run

```bash
pnpm install   # or npm / yarn — there are no workspace deps
pnpm start     # opens the Expo dev menu
```

Scan the QR code with **Expo Go** (iOS / Android), or press `i`/`a` to launch a simulator.

## 5. Clean up the original repo (web + API only)

Once you've confirmed the new mobile repo runs end-to-end, you can shrink the original monorepo down to just the web + API. From the **monorepo root** (not from `mobile-export/`):

```bash
# Remove the Expo app and the export folder itself
git rm -r artifacts/jump-the-book mobile-export
# (Optional) Remove the now-mobile-only shared types if web doesn't use them.
# The web app DOES use lib/jump-the-book-shared, so keep it. Same for lib/api-client-react.
git commit -m "Remove mobile app — moved to jump-the-book-mobile repo"
git push
```

> **Don't delete `lib/jump-the-book-shared` or `lib/api-client-react`** from the original repo — the web app still imports from both.

## Keeping the two repos in sync

The two pieces of code that exist in **both** repos:

1. `lib/jump-the-book-shared/src/*` (here: `vendor/jump-the-book-shared/src/*`) — types, Open Library helpers, the `RemoteBook` ↔ `UserLibraryItem` mapper.
2. `lib/api-client-react/src/generated/*` (here: `vendor/api-client-react/src/generated/*`) — auto-generated React Query hooks + Zod schemas from the OpenAPI spec.

When you change either of these in the **API/web** repo, copy the updated files into this repo's `vendor/` folder and commit. (Both folders are tiny — a handful of files. If it ever becomes painful, publish them as a private npm package and depend on that from both repos.)
