import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";
import storageRouter from "./storage";
import meRouter from "./me";
import biblesRouter from "./bibles";
import companionRouter from "./companion";
import passageRouter from "./passage";
import coverRouter from "./cover";
import shareRouter from "./share";
import trendingRouter from "./trending";

const router: IRouter = Router();

// Order matters. `meRouter` calls `router.use(requireAuth)` at its top, so
// any request that even *enters* it without auth gets a 401 — regardless of
// whether the eventual route lives on a different router. Mount everything
// public first; mount `meRouter` last. `biblesRouter` mixes public routes
// (e.g. POST /books/context/search) and authed sub-routes, but its own
// internal auth-gated sub-router is mounted last inside the file, so the
// public routes are reached as long as biblesRouter itself is mounted before
// meRouter.
router.use(healthRouter);
router.use(shareRouter);
router.use(storageRouter);
router.use(trendingRouter);
router.use(scenesRouter);
router.use(passageRouter);
router.use(coverRouter);
router.use(biblesRouter);
router.use(companionRouter);
router.use(meRouter);

export default router;
