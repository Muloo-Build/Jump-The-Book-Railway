import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

/**
 * POST /api/passage/ocr
 *
 * Accepts a base64-encoded photograph of a book page and returns the
 * extracted text. Used by the "Snap the page" button on the book detail
 * page so a user reading on Kindle / paper can take a phone photo and
 * have the passage filled in for them.
 *
 * Auth: required. The OCR call is metered against our OpenAI account
 * so we lock it behind sign-in.
 */
// Stay safely under the express.json `limit: "5mb"` cap in app.ts so the
// body parser never 413s a request before this route can answer it.
const MAX_DATA_URL_LEN = 4_500_000;
// OpenAI vision only accepts these mime types, and accepting svg here
// would let a caller smuggle arbitrary scripted/recursive XML.
const ALLOWED_MIME_PREFIXES = [
  "data:image/jpeg;",
  "data:image/jpg;",
  "data:image/png;",
  "data:image/webp;",
  "data:image/gif;",
];

router.post("/passage/ocr", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Sign in to use the page scanner." });
  }

  const body = req.body as { dataUrl?: unknown } | null | undefined;
  const dataUrl = body?.dataUrl;
  if (
    typeof dataUrl !== "string" ||
    dataUrl.length < 64 ||
    dataUrl.length > MAX_DATA_URL_LEN
  ) {
    return res.status(400).json({ error: "Invalid image payload." });
  }
  if (!ALLOWED_MIME_PREFIXES.some((p) => dataUrl.startsWith(p))) {
    return res
      .status(400)
      .json({ error: "Image must be a JPEG, PNG, WebP, or GIF." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR engine for novels. Extract the prose verbatim, in reading order. Do NOT include page numbers, running headers, footnotes, or chapter titles unless they're inline with the prose. Do NOT summarize or paraphrase. If the image does not appear to be a page from a book, return an empty string.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the text from this book page photograph. Return only the verbatim text — no commentary.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const text = (completion.choices?.[0]?.message?.content ?? "")
      .toString()
      .trim();

    if (!text) {
      return res.status(422).json({
        error:
          "We couldn't read any text from that photo. Try a brighter, flatter shot of just the page.",
      });
    }

    return res.json({ text });
  } catch (err) {
    req.log.error({ err }, "OCR failed");
    return res
      .status(502)
      .json({ error: "The page scanner is temporarily unavailable." });
  }
});

export default router;
