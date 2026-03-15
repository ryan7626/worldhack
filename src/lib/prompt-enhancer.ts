import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { reverseGeocode } from "./geocoder";

// Use Featherless.ai for high-quality open-source models
const featherless = createOpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY,
});

// Explicitly use the chat model interface to avoid the /v1/responses (completions) fallback
const model = featherless.chat("Qwen/Qwen2.5-72B-Instruct");

interface PhotoContext {
  dateTaken?: string | null;
  latitude?: number;
  longitude?: number;
  description?: string;
  originalName?: string;
}

/**
 * Uses reverse geocoding + OpenAI to generate a rich scene description
 * from photo metadata. This is passed as `text_prompt` to the Marble API
 * to dramatically improve the quality of the generated 3D world.
 */
export async function enhancePrompt(context: PhotoContext): Promise<string> {
  const metadataParts: string[] = [];

  // 1. Resolve GPS to a real place name — specific first, broad as fallback
  if (context.latitude && context.longitude) {
    const geo = await reverseGeocode(context.latitude, context.longitude);
    if (geo) {
      // Tight/specific location (what Marble should try to match)
      const specificParts = [
        geo.landmark,
        geo.road,
        geo.neighbourhood,
      ].filter(Boolean);

      // Broad/general region (fallback context if Marble doesn't recognize the specific spot)
      const broadParts = [
        geo.city,
        geo.district,
        geo.state,
        geo.country,
      ].filter(Boolean);

      if (specificParts.length > 0) {
        metadataParts.push(`Exact Location: ${specificParts.join(", ")}`);
      }
      if (broadParts.length > 0) {
        metadataParts.push(`Region: ${broadParts.join(", ")}`);
      }
      metadataParts.push(`GPS: ${context.latitude.toFixed(6)}, ${context.longitude.toFixed(6)}`);
    } else {
      metadataParts.push(
        `GPS Coordinates: ${context.latitude.toFixed(6)}, ${context.longitude.toFixed(6)}`
      );
    }
  }

  // 2. Time context
  if (context.dateTaken) {
    const date = new Date(context.dateTaken);
    const hour = date.getHours();
    const timeOfDay =
      hour < 6 ? "pre-dawn (dark sky, possibly stars)" :
      hour < 8 ? "early morning (soft golden light, long shadows, cool air)" :
      hour < 11 ? "mid-morning (bright, warm sunlight)" :
      hour < 14 ? "midday (harsh overhead sun, short shadows)" :
      hour < 17 ? "afternoon (warm angled light)" :
      hour < 19 ? "golden hour (rich amber light, dramatic long shadows)" :
      hour < 21 ? "dusk/twilight (deep blue sky, warm horizon glow)" :
      "nighttime (dark sky, artificial lights, city glow)";

    const season = (() => {
      const month = date.getMonth();
      if (month >= 2 && month <= 4) return "spring";
      if (month >= 5 && month <= 7) return "summer";
      if (month >= 8 && month <= 10) return "autumn/fall";
      return "winter";
    })();

    metadataParts.push(
      `Date: ${date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      `Time of Day: ${timeOfDay}`,
      `Season: ${season}`
    );
  }

  if (context.originalName) {
    metadataParts.push(`Original Filename: ${context.originalName}`);
  }

  if (context.description) {
    metadataParts.push(`User note: ${context.description}`);
  }

  const metadataBlock = metadataParts.length > 0
    ? `\n\nExtracted metadata:\n${metadataParts.map(p => `- ${p}`).join("\n")}`
    : "";

  try {
    const { text } = await generateText({
      model: model,
      system: `You write short scene descriptions for a 3D environment generator. You ONLY use the metadata provided — do NOT invent or assume any details not given.

RULES:
1. ONLY describe what the metadata tells you: location name, time of day, season, lighting conditions.
2. Do NOT hallucinate landmarks, architecture, vegetation, materials, or cultural details unless explicitly stated in the metadata.
3. Keep it to 1-2 short sentences focused on lighting and atmosphere.
4. Use the time of day and season purely to describe lighting (e.g. "warm golden-hour light", "overcast winter midday").
5. If a location is given, mention it by name but do NOT describe what it looks like.
6. NEVER mention cameras, photos, or images.
7. Do NOT start with "The scene is" or "This is".`,

      prompt: `Write a brief, factual scene description using ONLY the metadata below. Do not add any details beyond what is provided.${metadataBlock}`,
    });

    return text;
  } catch (error) {
    console.warn("Prompt enhancement failed, using fallback:", error);
    return buildFallbackPrompt(context);
  }
}

function buildFallbackPrompt(context: PhotoContext): string {
  const parts: string[] = [];

  if (context.dateTaken) {
    const hour = new Date(context.dateTaken).getHours();
    if (hour < 6 || hour > 20) parts.push("A nighttime scene with ambient artificial or moonlit lighting.");
    else if (hour < 9 || hour > 17) parts.push("Warm, golden-hour lighting with long shadows and rich colors.");
    else parts.push("Bright, natural daylight with clear visibility.");
  }

  if (context.description) {
    parts.push(context.description);
  }

  return parts.join(" ") || "A detailed, photorealistic environment extending in all directions.";
}
