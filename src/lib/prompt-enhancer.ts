import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { reverseGeocode } from "./geocoder";

// Use OpenRouter-compatible endpoint since the project key is an OpenRouter key
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    "HTTP-Referer": "https://github.com/memory-reliver", // Required by OpenRouter
    "X-Title": "Memory Reliver",
  },
});

const model = openrouter("openai/gpt-4o-mini");

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

  // 1. Resolve GPS to a real place name
  if (context.latitude && context.longitude) {
    const geo = await reverseGeocode(context.latitude, context.longitude);
    if (geo) {
      const locationParts = [
        geo.landmark,
        geo.neighbourhood,
        geo.city,
        geo.state,
        geo.country
      ].filter(Boolean);

      metadataParts.push(`Location: ${locationParts.join(", ")}`);
      metadataParts.push(`Full Address: ${geo.placeName}`);
    } else {
      metadataParts.push(
        `GPS Coordinates: ${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}`
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
      system: `You are a world-building expert for a 3D spatial reconstruction AI. Your job is to write an immersive, hyper-specific scene description that guides the AI to create a stunning 360° 3D environment from a single photograph.

CRITICAL RULES:
1. If a LOCATION is provided, you MUST research your knowledge of that exact place and describe its real-world characteristics — the architecture, vegetation, terrain, nearby landmarks, typical weather, and cultural atmosphere.
2. Use the TIME OF DAY and SEASON to set precise lighting: sun angle, shadow direction, sky gradient colors, ambient light temperature.
3. Describe the FULL 360° environment — what's in front, behind, left, right, above, and below the camera. The AI needs to generate the parts of the scene that the photo doesn't show.
4. Be specific about materials and textures: concrete sidewalks, wet asphalt, weathered wood, ocean spray, etc.
5. Write 2-3 dense sentences. No fluff, no generic descriptions. Every word should add spatial information.
6. NEVER mention cameras, photographers, photos, or images. Describe a LIVING PLACE, not a picture.
7. Do NOT start with "The scene is" or "This is". Jump straight into the description.`,

      prompt: `Write a 360° spatial scene description for a 3D world reconstruction.${metadataBlock}

Generate a vivid, location-accurate, lighting-aware description of this environment.`,
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
