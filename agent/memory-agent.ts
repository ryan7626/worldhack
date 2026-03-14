import { voice, llm } from "@livekit/agents";
import { z } from "zod";
import fs from "fs";
import path from "path";

// Read photo store directly from disk (shared with Next.js app)
function getPhotoStore() {
  const storePath = path.join(process.cwd(), "data", "photos.json");
  if (!fs.existsSync(storePath)) return { photos: [] };
  return JSON.parse(fs.readFileSync(storePath, "utf-8"));
}

function searchPhotosByQuery(query: string) {
  const store = getPhotoStore();
  const q = query.toLowerCase();
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  return store.photos.filter((photo: { dateTaken: string | null; description: string; originalName: string; location?: string; tags?: string[] }) => {
    if (!photo.dateTaken) return false;

    const photoDate = new Date(photo.dateTaken);
    let matched = false;

    // Year match
    const yearMatch = q.match(/\b(19|20)\d{2}\b/);
    if (yearMatch && photoDate.getFullYear().toString() === yearMatch[0]) {
      matched = true;
    }

    // Month match
    for (let i = 0; i < months.length; i++) {
      if (q.includes(months[i]) && photoDate.getMonth() === i) {
        matched = true;
      }
    }

    // Day match combined with month/year
    const dayMatch = q.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
    if (dayMatch && matched) {
      const day = parseInt(dayMatch[1]);
      if (day >= 1 && day <= 31 && photoDate.getDate() === day) {
        // Already matched month/year, day also matches
      } else if (day >= 1 && day <= 31) {
        matched = photoDate.getDate() === day && matched;
      }
    }

    // Text match in description/tags
    const searchable = [
      photo.description || "",
      photo.originalName || "",
      photo.location || "",
      ...(photo.tags || []),
    ].join(" ").toLowerCase();

    if (searchable.includes(q)) matched = true;

    return matched;
  });
}

// Marble API helpers
const MARBLE_API_BASE = "https://api.worldlabs.ai/marble/v1";

async function marbleHeaders() {
  return {
    "WLT-Api-Key": process.env.MARBLE_API_KEY || "",
    "Content-Type": "application/json",
  };
}

async function generateWorldFromPhoto(photoUrl: string, displayName: string) {
  // If it's a local path, we need to upload it first
  const fullUrl = photoUrl.startsWith("http")
    ? photoUrl
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${photoUrl}`;

  const res = await fetch(`${MARBLE_API_BASE}/worlds:generate`, {
    method: "POST",
    headers: await marbleHeaders(),
    body: JSON.stringify({
      display_name: displayName,
      model: "Marble 0.1-mini",
      world_prompt: {
        type: "image",
        image_prompt: {
          source: "uri",
          uri: fullUrl,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const operationName = data.name || data.id;
  const operationId = operationName?.includes?.("/")
    ? operationName.split("/").pop()
    : operationName;
  return { operationId, data };
}

async function pollMarbleOperation(operationId: string) {
  const res = await fetch(`${MARBLE_API_BASE}/operations/${operationId}`, {
    headers: { "WLT-Api-Key": process.env.MARBLE_API_KEY || "" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble poll error: ${res.status} ${text}`);
  }

  return res.json();
}

export class MemoryAgent extends voice.Agent {
  constructor() {
    super({
      instructions: `You are the Memory Reliver, a warm and nostalgic AI assistant that helps people relive their past memories as immersive 3D worlds.

Your personality:
- Warm, empathetic, and nostalgic — like a close friend helping someone revisit cherished moments
- Express genuine curiosity and delight when exploring memories
- Use vivid, sensory language when describing what you find in photos
- Be encouraging and emotionally supportive

Your capabilities:
1. Search through the user's uploaded photos by date, description, or keywords
2. Generate immersive 3D worlds from their photos using the Marble API
3. Narrate and describe the memories as the worlds are being created

Workflow:
1. When a user asks about a memory (e.g., "What was I doing on December 1st, 2009?"), use the search_memories tool to find matching photos
2. Describe what you found — the photos, dates, any context
3. Ask the user if they'd like to turn a specific photo into an explorable 3D world
4. If yes, use the generate_world tool to create the world
5. While the world generates, narrate the memory warmly — imagine the scene, the feelings, the atmosphere
6. Tell them when the world is ready and they can explore it

Important:
- Always search for photos first before trying to generate a world
- Be conversational and keep responses concise for voice
- If no photos match, suggest the user upload more photos or try a different date
- Express excitement when you find matching memories`,

      tools: {
        search_memories: llm.tool({
          description:
            "Search through the user's uploaded photo memories by date, description, location, or keywords. Use this when the user asks about a specific time, event, or memory. Returns matching photos with their dates and descriptions.",
          parameters: z.object({
            query: z
              .string()
              .describe(
                "The search query — can be a date like 'december 2009', a description like 'beach vacation', or keywords like 'birthday party'"
              ),
          }),
          execute: async ({ query }) => {
            const results = searchPhotosByQuery(query);
            if (results.length === 0) {
              return {
                found: false,
                message: "No photos found matching that query. The user may need to upload more photos.",
                photoCount: 0,
              };
            }
            return {
              found: true,
              photoCount: results.length,
              photos: results.map((p: { id: string; originalName: string; dateTaken: string | null; description: string; url: string; location?: string }) => ({
                id: p.id,
                name: p.originalName,
                dateTaken: p.dateTaken,
                description: p.description,
                url: p.url,
                location: p.location,
              })),
            };
          },
        }),

        generate_world: llm.tool({
          description:
            "Generate an immersive 3D world from a photo using the Marble API. Use this after finding photos with search_memories, when the user wants to explore a memory as a 3D environment. The world takes about 30-45 seconds to generate with the mini model.",
          parameters: z.object({
            photoId: z
              .string()
              .describe("The ID of the photo to generate a world from"),
            photoUrl: z
              .string()
              .describe("The URL path of the photo (e.g., /uploads/abc.jpg)"),
            memoryTitle: z
              .string()
              .describe(
                "A descriptive title for this memory world, e.g., 'Beach Sunset, Summer 2009'"
              ),
          }),
          execute: async ({ photoId, photoUrl, memoryTitle }) => {
            try {
              const result = await generateWorldFromPhoto(photoUrl, memoryTitle);
              return {
                success: true,
                operationId: result.operationId,
                message: `World generation started! The 3D world "${memoryTitle}" is being created. It should be ready in about 30-45 seconds.`,
                photoId,
              };
            } catch (error) {
              return {
                success: false,
                message: `Failed to start world generation: ${error instanceof Error ? error.message : "Unknown error"}`,
              };
            }
          },
        }),

        check_world_status: llm.tool({
          description:
            "Check if a previously started world generation is complete. Use this to poll the status of a world being generated.",
          parameters: z.object({
            operationId: z
              .string()
              .describe("The operation ID returned from generate_world"),
          }),
          execute: async ({ operationId }) => {
            try {
              const result = await pollMarbleOperation(operationId);
              if (result.done && result.response) {
                return {
                  done: true,
                  worldUrl: result.response.world_marble_url,
                  worldId: result.response.id,
                  caption: result.response.assets?.caption,
                  thumbnailUrl: result.response.assets?.thumbnail_url,
                  splatUrls: result.response.assets?.splats?.spz_urls,
                };
              }
              return {
                done: false,
                message: "Still generating... The world will be ready soon.",
              };
            } catch (error) {
              return {
                done: false,
                error: `Failed to check status: ${error instanceof Error ? error.message : "Unknown error"}`,
              };
            }
          },
        }),
      },
    });
  }
}
