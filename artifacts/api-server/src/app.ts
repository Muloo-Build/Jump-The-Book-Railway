import path from "node:path";
import { existsSync } from "node:fs";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Restrict CORS to trusted origins. In production the web app is served by this
// API process, so requests are normally same-origin. For preview/custom domains
// we also accept explicit origins configured through env vars.
const allowedOrigins = new Set<string>(
  [
    process.env.REPLIT_DOMAINS,
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    process.env.RAILWAY_STATIC_URL,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((d) => d.trim().replace(/^https?:\/\//, ""))
    .filter(Boolean)
    .flatMap((d) => [`https://${d}`, `http://${d}`]),
);
const devDomain = process.env.REPLIT_DEV_DOMAIN;
if (devDomain) {
  allowedOrigins.add(`https://${devDomain}`);
  allowedOrigins.add(`http://${devDomain}`);
}

app.use(
  cors({
    credentials: true,
    origin(origin, cb) {
      // Same-origin requests (browser fetch with no Origin) and tools like
      // curl pass `undefined` — always allow.
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req: Request) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

const webDistDir =
  process.env.WEB_DIST_DIR ??
  path.resolve(import.meta.dirname, "../../jump-the-book-web/dist/public");

if (existsSync(webDistDir)) {
  const indexHtml = path.join(webDistDir, "index.html");
  app.use(express.static(webDistDir, { index: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml);
  });
} else {
  logger.warn(
    { webDistDir },
    "Web build directory not found; SPA will not be served.",
  );
}

export default app;
