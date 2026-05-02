import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * Allow-list of namespaces that this public route may read from. Anything
 * stored outside these namespaces (e.g. user uploads) is not reachable here.
 */
const ALLOWED_PUBLIC_NAMESPACES = new Set(["scene-images"]);

/**
 * GET /storage/objects/<namespace>/<id>
 *
 * Serve object entities from PRIVATE_OBJECT_DIR, but only from explicitly
 * allow-listed namespaces. Scene images are not user-specific so they live
 * under `scene-images/` and are served publicly.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const segments = wildcardPath.split("/").filter(Boolean);
    if (segments.length < 2) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    const [namespace, ...rest] = segments;
    if (!ALLOWED_PUBLIC_NAMESPACES.has(namespace) || rest.length === 0) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    if (rest.some((s) => s === "" || s === "." || s === "..")) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    const objectPath = `/objects/${namespace}/${rest.join("/")}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
