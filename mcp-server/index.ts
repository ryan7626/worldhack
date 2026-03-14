#!/usr/bin/env node
/**
 * Memory Reliver MCP Server
 *
 * Exposes photo memory search and Marble world generation as MCP tools.
 * Can be used with Claude Desktop, Vercel AI SDK, or any MCP client.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "photos.json");

interface PhotoMetadata {
  id: string;
  filename: string;
  originalName: string;
  dateTaken: string | null;
  description: string;
  tags: string[];
  url: string;
  location?: string;
}

function getPhotoStore(): { photos: PhotoMetadata[] } {
  if (!fs.existsSync(STORE_PATH)) return { photos: [] };
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
}

function searchPhotos(query: string): PhotoMetadata[] {
  const store = getPhotoStore();
  const q = query.toLowerCase();
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  return store.photos.filter((photo) => {
    if (!photo.dateTaken && !photo.description) return false;

    let matched = false;

    if (photo.dateTaken) {
      const photoDate = new Date(photo.dateTaken);

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
    }

    // Text match
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

// Create MCP server
const server = new McpServer({
  name: "memory-reliver",
  version: "1.0.0",
});

// Register tools
server.tool(
  "search_memories",
  "Search through uploaded photo memories by date, description, or keywords. Returns matching photos with dates and metadata.",
  {
    query: z
      .string()
      .describe(
        "Search query — a date like 'december 2009', description like 'beach', or keywords"
      ),
  },
  async ({ query }) => {
    const results = searchPhotos(query);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No photos found matching "${query}". Try uploading more photos or using a different search term.`,
          },
        ],
      };
    }

    const photoList = results
      .map((p) => {
        const date = p.dateTaken
          ? new Date(p.dateTaken).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Unknown date";
        return `- ${p.originalName} (${date})${p.description ? `: ${p.description}` : ""} [ID: ${p.id}]`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} photo(s) matching "${query}":\n\n${photoList}`,
        },
      ],
    };
  }
);

server.tool(
  "list_all_memories",
  "List all uploaded photos with their dates and metadata.",
  {},
  async () => {
    const store = getPhotoStore();

    if (store.photos.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No photos uploaded yet. Upload photos through the Memory Reliver web app first.",
          },
        ],
      };
    }

    const photoList = store.photos
      .map((p) => {
        const date = p.dateTaken
          ? new Date(p.dateTaken).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "No date";
        return `- ${p.originalName} (${date}) [ID: ${p.id}]`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `${store.photos.length} memories uploaded:\n\n${photoList}`,
        },
      ],
    };
  }
);

server.tool(
  "get_memory_details",
  "Get detailed information about a specific photo memory by its ID.",
  {
    photoId: z.string().describe("The photo ID"),
  },
  async ({ photoId }) => {
    const store = getPhotoStore();
    const photo = store.photos.find((p) => p.id === photoId);

    if (!photo) {
      return {
        content: [
          { type: "text" as const, text: `No photo found with ID: ${photoId}` },
        ],
      };
    }

    const date = photo.dateTaken
      ? new Date(photo.dateTaken).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown date";

    return {
      content: [
        {
          type: "text" as const,
          text: `Photo: ${photo.originalName}\nDate: ${date}\nDescription: ${photo.description || "None"}\nLocation: ${photo.location || "Unknown"}\nTags: ${photo.tags?.join(", ") || "None"}\nURL: ${photo.url}\nID: ${photo.id}`,
        },
      ],
    };
  }
);

server.tool(
  "generate_marble_world",
  "Generate an immersive 3D world from a photo using the Marble API. Returns the world URL when complete. Takes 30-300 seconds depending on the model.",
  {
    photoId: z.string().describe("The photo ID to generate a world from"),
    title: z
      .string()
      .describe(
        "A descriptive title for the memory world"
      )
      .optional(),
  },
  async ({ photoId, title }) => {
    const store = getPhotoStore();
    const photo = store.photos.find((p) => p.id === photoId);

    if (!photo) {
      return {
        content: [
          { type: "text" as const, text: `No photo found with ID: ${photoId}` },
        ],
      };
    }

    const apiKey = process.env.MARBLE_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text" as const,
            text: "MARBLE_API_KEY not configured. Set it in your environment.",
          },
        ],
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const imageUrl = `${appUrl}${photo.url}`;
    const displayName = title || photo.description || photo.originalName;

    try {
      // Start generation
      const genRes = await fetch(
        "https://api.worldlabs.ai/marble/v1/worlds:generate",
        {
          method: "POST",
          headers: {
            "WLT-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            display_name: displayName,
            model: "Marble 0.1-mini",
            world_prompt: {
              type: "image",
              image_prompt: { source: "uri", uri: imageUrl },
            },
          }),
        }
      );

      if (!genRes.ok) {
        const text = await genRes.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Marble API error: ${genRes.status} ${text}`,
            },
          ],
        };
      }

      const genData = await genRes.json();
      const opName = genData.name || genData.id;
      const opId = opName?.includes?.("/") ? opName.split("/").pop() : opName;

      // Poll for completion
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await fetch(
          `https://api.worldlabs.ai/marble/v1/operations/${opId}`,
          { headers: { "WLT-Api-Key": apiKey } }
        );
        const pollData = await pollRes.json();

        if (pollData.done && pollData.response) {
          return {
            content: [
              {
                type: "text" as const,
                text: `3D World generated successfully!\n\nTitle: ${displayName}\nWorld URL: ${pollData.response.world_marble_url}\nCaption: ${pollData.response.assets?.caption || "N/A"}\n\nYou can explore this world at the URL above.`,
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `World generation started (operation: ${opId}) but is taking longer than expected. Check status manually.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory Reliver MCP server started");
}

main().catch(console.error);
