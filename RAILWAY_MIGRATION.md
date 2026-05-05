# Railway Migration

This fork is configured to run as one Railway web service:

- `pnpm run build` typechecks and builds all workspaces.
- `pnpm start` starts `@workspace/api-server`.
- The API listens on Railway's injected `PORT`.
- The API serves `/api/*` plus the built Vite app from `artifacts/jump-the-book-web/dist/public`.
- Railway health checks should use `/api/healthz`.

## Railway Services

Create or connect these Railway resources:

1. Web service from this GitHub repo.
2. PostgreSQL database plugin attached to the web service.
3. Optional but recommended volume attached to the web service for generated scene images.

Railway injects `PORT` automatically. Do not set it manually unless you are deliberately overriding the service port.

## Required Variables

Set these on the Railway web service:

```sh
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=sk-...
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_CLERK_PROXY_URL=/api/__clerk
```

`OPENAI_BASE_URL` is optional. If omitted, the app uses `https://api.openai.com/v1`.

## Generated Image Storage

Replit Object Storage has been replaced by filesystem storage.

For persistent storage on Railway, attach a volume to the web service. The app automatically uses:

```sh
RAILWAY_VOLUME_MOUNT_PATH/object-storage
```

You can override this with:

```sh
OBJECT_STORAGE_DIR=/absolute/path/to/object-storage
```

Without a Railway volume or `OBJECT_STORAGE_DIR`, files are written to `.data/object-storage` inside the running container and may be lost on redeploy.

## Optional Variables

```sh
CORS_ALLOWED_ORIGINS=your-domain.com,preview-domain.up.railway.app
LOG_LEVEL=info
WEB_DIST_DIR=/absolute/path/to/custom/web/dist/public
```

The app also still understands older Replit variable names where useful, but new Railway deployments should use the variables above.
