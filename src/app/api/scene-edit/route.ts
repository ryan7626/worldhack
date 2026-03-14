import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface SceneParams {
  backgroundColor: [number, number, number];
  ambientLightColor: [number, number, number];
  ambientLightIntensity: number;
  splatTint: [number, number, number] | null;
  splatOpacity: number;
  fogColor: [number, number, number] | null;
  fogDensity: number;
  description: string;
}

const DEFAULT_SCENE: SceneParams = {
  backgroundColor: [10, 10, 20],
  ambientLightColor: [255, 255, 255],
  ambientLightIntensity: 0.8,
  splatTint: null,
  splatOpacity: 1.0,
  fogColor: null,
  fogDensity: 0,
  description: "Default scene",
};

export async function POST(request: NextRequest) {
  try {
    const { command, currentScene } = await request.json();

    if (!command) {
      return NextResponse.json({ error: "command is required" }, { status: 400 });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a 3D scene mood editor. Given a user command, output JSON with scene parameters to modify the mood/atmosphere of a Gaussian splat 3D world.

Output format (all fields required):
{
  "backgroundColor": [r, g, b],       // RGB 0-255, the sky/background color
  "ambientLightColor": [r, g, b],     // RGB 0-255, ambient light color
  "ambientLightIntensity": 0.0-2.0,   // light brightness
  "splatTint": [r, g, b] | null,      // RGB 0-255, color tint overlay on the 3D world, null for no tint
  "splatOpacity": 0.0-1.0,            // world opacity
  "fogColor": [r, g, b] | null,       // RGB 0-255, atmospheric fog color, null for no fog
  "fogDensity": 0.0-0.1,              // fog thickness (0 = none, 0.02 = light, 0.05 = thick, 0.1 = very dense)
  "description": "brief description of the mood change"
}

Examples:
- "make it sunset" → warm orange background, golden light, amber tint
- "night time" → dark navy background, dim blue light, dark blue tint, light fog
- "dreamy" → lavender background, soft pink light, light purple tint, medium fog
- "make it warmer" → slightly increase warmth of existing colors
- "add rain" → dark gray background, dim white light, blue-gray tint, dense fog
- "clear day" → bright blue background, bright white light, no tint, no fog
- "spooky" → very dark background, dim green light, dark green tint, thick fog
- "reset" → return to defaults

Current scene state: ${JSON.stringify(currentScene || DEFAULT_SCENE)}`,
          },
          { role: "user", content: command },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `OpenAI error: ${text}` }, { status: 500 });
    }

    const data = await res.json();
    const params: SceneParams = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ params });
  } catch (error) {
    console.error("Scene edit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process command" },
      { status: 500 }
    );
  }
}
