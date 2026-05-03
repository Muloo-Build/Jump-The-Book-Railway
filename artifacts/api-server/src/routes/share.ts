import { Router, type IRouter, type Request, type Response } from "express";

/**
 * Public scene-sharing endpoint.
 *
 * Accepts scene metadata as query params and returns an HTML page with
 * Open Graph + Twitter Card meta tags so social media unfurls show the scene
 * art and narration. Real users are immediately redirected to the SPA's
 * `/scene-share` route which renders the same content interactively.
 *
 * No auth required: scene images live in a public namespace already, and
 * sharing is opt-in (the user clicks Share).
 */

const router: IRouter = Router();

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

function clamp(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.slice(0, max);
}

/**
 * Validate that an image URL is safe to embed (http/https only) and
 * resolve it to an absolute URL using the request's host as the base.
 * Returns null for anything we don't trust.
 */
function safeAbsoluteImageUrl(raw: string, baseOrigin: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, baseOrigin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

router.get("/share/scene", (req: Request, res: Response) => {
  const title = clamp(req.query.title, 200) || "A scene";
  const narration = clamp(req.query.narration, 600);
  const book = clamp(req.query.book, 200);
  const author = clamp(req.query.author, 200);
  const mood = clamp(req.query.mood, 100);
  const location = clamp(req.query.location, 200);
  const imgRaw = clamp(req.query.img, 2000);

  const proto = ((req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol ?? "https").split(",")[0]!.trim();
  const host = req.get("host") ?? "";
  const origin = `${proto}://${host}`;
  const imgUrl = safeAbsoluteImageUrl(imgRaw, origin);

  const description = narration
    ? `"${narration}"${book ? ` — From ${book}${author ? ` by ${author}` : ""}` : ""}`
    : book
      ? `From ${book}${author ? ` by ${author}` : ""}`
      : "A spoiler-safe scene from Jump the Book";

  const ownUrl = `${origin}${req.originalUrl}`;

  const spaParams = new URLSearchParams();
  if (title) spaParams.set("title", title);
  if (narration) spaParams.set("narration", narration);
  if (book) spaParams.set("book", book);
  if (author) spaParams.set("author", author);
  if (mood) spaParams.set("mood", mood);
  if (location) spaParams.set("location", location);
  if (imgUrl) spaParams.set("img", imgUrl);
  const spaPath = `/scene-share?${spaParams.toString()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(title)} — Jump the Book</title>
  <meta name="description" content="${escHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Jump the Book">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:url" content="${escHtml(ownUrl)}">
  ${imgUrl ? `<meta property="og:image" content="${escHtml(imgUrl)}">\n  <meta property="og:image:width" content="1024">\n  <meta property="og:image:height" content="1024">` : ""}
  <meta name="twitter:card" content="${imgUrl ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  ${imgUrl ? `<meta name="twitter:image" content="${escHtml(imgUrl)}">` : ""}
  <link rel="canonical" href="${escHtml(spaPath)}">
  <meta http-equiv="refresh" content="0; url=${escHtml(spaPath)}">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0613; color: #f0e9d2; margin: 0; }
    main { max-width: 640px; margin: 0 auto; padding: 32px 24px; text-align: center; }
    img { max-width: 100%; border-radius: 12px; margin: 24px 0; display: block; }
    h1 { font-size: 28px; margin: 8px 0 16px; }
    p { line-height: 1.6; }
    a { color: #f0c97a; text-decoration: none; font-weight: 600; }
    em { color: #d4c89a; }
  </style>
</head>
<body>
  <main>
    <h1>${escHtml(title)}</h1>
    ${imgUrl ? `<img src="${escHtml(imgUrl)}" alt="${escHtml(title)}">` : ""}
    ${narration ? `<p style="font-style: italic;">"${escHtml(narration)}"</p>` : ""}
    ${book ? `<p>From <em>${escHtml(book)}</em>${author ? ` by ${escHtml(author)}` : ""}</p>` : ""}
    <p style="margin-top: 32px;"><a href="${escHtml(spaPath)}">Open in Jump the Book →</a></p>
  </main>
  <script>window.location.replace(${JSON.stringify(spaPath)});</script>
</body>
</html>`;

  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300");
  res.send(html);
});

export default router;
