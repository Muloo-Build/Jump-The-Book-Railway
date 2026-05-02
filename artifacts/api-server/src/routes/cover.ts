import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

/**
 * POST /api/books/cover/identify
 *
 * Accepts a base64-encoded photograph of a book cover and returns the
 * model's best read of the title and author plus a confidence score.
 * The client then runs the suggested title+author through Open Library
 * to surface 2–3 candidate matches the user can pick from.
 *
 * Auth: required. Vision calls are metered against our OpenAI account
 * so we lock the endpoint behind sign-in, same as /passage/ocr.
 */
const MAX_DATA_URL_LEN = 4_500_000;
const ALLOWED_MIME_PREFIXES = [
  "data:image/jpeg;",
  "data:image/jpg;",
  "data:image/png;",
  "data:image/webp;",
  "data:image/gif;",
];

interface CoverIdentifyResult {
  title: string;
  author: string;
  // 0..1 self-reported by the vision model. Used by the client to decide
  // whether to surface the OL picker or fall back to a manual entry hint.
  confidence: number;
  // Free-form note when the model can't read enough to be useful; the
  // client uses this to drive the toast.
  note?: string;
}

router.post("/books/cover/identify", async (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Sign in to use the cover scanner." });
    return;
  }

  const body = req.body as { dataUrl?: unknown } | null | undefined;
  const dataUrl = body?.dataUrl;
  if (
    typeof dataUrl !== "string" ||
    dataUrl.length < 64 ||
    dataUrl.length > MAX_DATA_URL_LEN
  ) {
    res.status(400).json({ error: "Invalid image payload." });
    return;
  }
  if (!ALLOWED_MIME_PREFIXES.some((p) => dataUrl.startsWith(p))) {
    res
      .status(400)
      .json({ error: "Image must be a JPEG, PNG, WebP, or GIF." });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You identify books from photographs of their covers. Respond with strict JSON: {"title": string, "author": string, "confidence": number from 0 to 1, "note": string?}. ' +
            "Use the exact title as printed on the cover (subtitle on the same cover is fine to include after a colon). " +
            "Use the most prominent author credit (skip series-editor / forewords / 'illustrated by'). " +
            'If you cannot read enough to be useful, return {"title": "", "author": "", "confidence": 0, "note": "reason"}. ' +
            "Never invent a book that isn't on the cover.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify the book from this cover photograph. Return JSON only.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const raw = (completion.choices?.[0]?.message?.content ?? "").toString();
    let parsed: CoverIdentifyResult;
    try {
      const obj = JSON.parse(raw) as Partial<CoverIdentifyResult>;
      parsed = {
        title: typeof obj.title === "string" ? obj.title.trim() : "",
        author: typeof obj.author === "string" ? obj.author.trim() : "",
        confidence:
          typeof obj.confidence === "number" &&
          Number.isFinite(obj.confidence)
            ? Math.max(0, Math.min(1, obj.confidence))
            : 0,
        note: typeof obj.note === "string" ? obj.note.slice(0, 200) : undefined,
      };
    } catch {
      req.log.warn({ raw }, "cover identify: model returned non-JSON");
      res.status(422).json({
        error:
          "We couldn't read that cover. Try a flatter, well-lit shot with the title in frame.",
      });
      return;
    }

    if (!parsed.title || !parsed.author) {
      res.status(422).json({
        error:
          parsed.note ||
          "We couldn't make out the title and author. Try a flatter, well-lit shot with both in frame.",
      });
      return;
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "cover identify failed");
    res
      .status(502)
      .json({ error: "The cover scanner is temporarily unavailable." });
  }
});

export default router;
