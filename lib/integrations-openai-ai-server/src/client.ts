import OpenAI from "openai";

const apiKey =
  process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL =
  process.env.OPENAI_BASE_URL ??
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??
  "https://api.openai.com/v1";

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY must be set. AI_INTEGRATIONS_OPENAI_API_KEY is also supported for older Replit deployments.",
  );
}

export const openai = new OpenAI({
  apiKey,
  baseURL,
});
