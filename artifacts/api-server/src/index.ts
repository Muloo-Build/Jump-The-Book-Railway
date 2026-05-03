import app from "./app";
import { logger } from "./lib/logger";
import { backfillSceneImageUrls } from "./lib/backfillSceneImageUrls";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Fire-and-forget: link any saved scenes to their already-generated images
  // that didn't get persisted because the user navigated away mid-paint.
  void backfillSceneImageUrls();
});
