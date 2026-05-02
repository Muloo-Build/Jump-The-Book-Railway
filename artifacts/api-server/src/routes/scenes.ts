import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

const STYLE_DESCRIPTIONS: Record<string, string> = {
  "comic-book": "bold comic book illustration with vibrant ink outlines, dynamic panel composition, halftone shading",
  watercolour: "soft delicate watercolour painting with gentle washes of translucent colour and flowing brushwork",
  "dark-cinematic": "moody cinematic film still, dramatic chiaroscuro lighting, deep atmospheric shadows, filmic grain",
  "animated-storybook": "warm illustrated storybook art, gentle palette, whimsical handcrafted details, cozy textures",
  "manga-inspired": "expressive black-and-white manga illustration, clean precise ink lines, screentone shading, dramatic angles",
  "fantasy-illustration": "rich detailed fantasy oil painting, luminous colours, intricate world-building details, painterly textures",
};

const SPOILER_SYSTEM = `You are a visual story companion AI for a reading app. Generate spoiler-safe scene companion cards.

STRICT SPOILER RULES — violations ruin the app:
- NEVER reveal who dies, who survives, betrayals, twists, or final outcomes
- NEVER describe the result of confrontations, battles, or decisions
- ONLY describe what a reader observes at the start/arrival of a scene: setting, atmosphere, sensory mood
- Characters: describe appearance, emotion on their face, presence — NOT their actions or choices
- Think of it as a painting that captures the MOOD of a scene, not a plot summary

OUTPUT: Return only valid JSON in this exact shape:
{
  "scenes": [
    {
      "title": "Scene title (evocative, no spoilers)",
      "summary": "2-3 sentences describing the scene's atmosphere and setting only",
      "narration": "A single cinematic sentence — like a book's opening line for this scene (max 20 words)",
      "location": "Location name",
      "mood": "3 mood adjectives comma-separated",
      "characters": ["Character name 1", "Character name 2"],
      "gradientColors": ["#hex1", "#hex2", "#hex3"],
      "imagePrompt": "Detailed visual description for image generation: setting, lighting, atmosphere, colour palette. No plot actions."
    }
  ]
}

gradientColors: 2-3 hex colours that match the emotional palette of the scene.
Generate 3-5 scenes that progress naturally through the chapter.`;

router.post("/scenes/generate", async (req, res) => {
  try {
    const {
      bookTitle,
      author,
      chapterTitle,
      chapterNumber,
      visualStyle = "fantasy-illustration",
      spoilerMode = "no-spoilers",
      excerpt,
      generateImage = false,
    } = req.body as {
      bookTitle: string;
      author: string;
      chapterTitle: string;
      chapterNumber: number;
      visualStyle?: string;
      spoilerMode?: string;
      excerpt?: string;
      generateImage?: boolean;
    };

    if (!bookTitle || !author) {
      res.status(400).json({ error: "bookTitle and author are required" });
      return;
    }

    const userPrompt = `Book: "${bookTitle}" by ${author}
Chapter ${chapterNumber}: "${chapterTitle}"
Spoiler strictness: ${spoilerMode}
${excerpt ? `\nExcerpt from this chapter:\n---\n${excerpt.slice(0, 3000)}\n---` : ""}

Generate visual scene companion cards for this chapter. Remember: atmosphere and setting only, no plot reveals.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SPOILER_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { scenes?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { scenes: [] };
    }

    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];

    let imageB64: string | null = null;
    if (generateImage && scenes.length > 0) {
      const firstScene = scenes[0] as Record<string, unknown>;
      const imagePrompt = firstScene?.imagePrompt as string ?? "";
      const styleDesc = STYLE_DESCRIPTIONS[visualStyle] ?? "illustrated";
      const fullPrompt = `${styleDesc}. ${imagePrompt} No text, no words, no letters, purely visual artwork.`;
      try {
        const buffer = await generateImageBuffer(fullPrompt, "1024x1024");
        imageB64 = buffer.toString("base64");
      } catch (imgErr) {
        req.log.warn({ imgErr }, "Image generation failed, continuing without image");
      }
    }

    res.json({ scenes, imageB64 });
  } catch (err) {
    req.log.error({ err }, "Scene generation failed");
    res.status(500).json({ error: "Scene generation failed" });
  }
});

router.post("/scenes/image", async (req, res) => {
  try {
    const { prompt, style = "fantasy-illustration" } = req.body as {
      prompt: string;
      style?: string;
    };

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const styleDesc = STYLE_DESCRIPTIONS[style] ?? "illustrated artwork";
    const fullPrompt = `${styleDesc}. ${prompt} No text, no words, no letters, purely visual artwork.`;
    const buffer = await generateImageBuffer(fullPrompt, "1024x1024");
    res.json({ b64: buffer.toString("base64") });
  } catch (err) {
    req.log.error({ err }, "Image generation failed");
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
