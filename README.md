# SceneForge

**SceneForge transforms ordinary photos into immersive, explorable 3D memory worlds.**

Upload images from your life, speak to a voice-native AI guide, search across your personal archive by date or theme, and generate cinematic 3D reconstructions you can open, inspect, and re-style in real time. What begins as a static photo archive becomes a living, spatial memory interface.

Built for **Worlds in Action Hack SF 2026**.

## Why SceneForge Feels Different

Most photo apps help you store the past.

SceneForge helps you **step back into it**.

Instead of forcing users to scroll through flat galleries, SceneForge turns memory retrieval into an interactive flow:

- **Upload once, recall naturally**
- **Search by moment, not filename**
- **Generate explorable worlds from real memories**
- **Talk to an AI that understands the archive**
- **Restyle the atmosphere of a world on command**
- **Bridge web, voice, MCP, and spatial computing in one system**

## Feature Overview

### 1. Personal Memory Vault

SceneForge ingests personal photos and turns them into a structured, queryable archive.

- Multi-image upload from the browser
- Drag-and-drop upload flow with visual progress feedback
- Public asset hosting through Supabase Storage
- Persistent metadata storage in Supabase Postgres
- Automatic archive loading on app startup
- Fast archive browsing through a dedicated side drawer
- Visual “vault” grid for quickly selecting memories to reconstruct

### 2. Deep Photo Metadata Extraction

The platform does more than store images. It extracts the context needed to make those images searchable and reconstruction-ready.

- EXIF date extraction
- Camera make and model extraction
- Image dimension extraction
- GPS coordinate extraction when present
- Support for manual date fallback when EXIF data is missing
- HEIC/HEIF detection and automatic conversion to JPEG
- Structured normalization into typed photo records

This metadata becomes the backbone of memory search, AI prompting, and world generation quality.

### 3. Voice-First Memory Retrieval

SceneForge is designed around conversation, not menus.

- One-tap voice session start from the main interface
- LiveKit-powered real-time voice transport
- Deepgram speech-to-text
- OpenAI-powered conversational reasoning
- OpenAI text-to-speech responses
- Active voice state feedback including connecting, listening, thinking, and speaking
- Session stop / disconnect controls
- Voice-first discovery flow for asking things like:
  - “What was I doing on December 1st, 2009?”
  - “Show me my summer vacation photos”
  - “Take me back to my birthday party”

### 4. AI Memory Agent

The built-in memory agent is not just a chatbot bolted on top of a gallery. It is an archive-aware orchestration layer.

- Searches uploaded memories by date, keywords, description, and location context
- Returns matching photos as structured tool results
- Initiates 3D world generation from chosen memories
- Polls generation status until a world is ready
- Greets users and guides them through memory exploration conversationally
- Optimized for short, natural voice interactions

### 5. AI-Enhanced World Prompting

Before SceneForge sends an image to the 3D generation pipeline, it enriches the reconstruction prompt using contextual signals from the photo itself.

- Builds prompt context from date, filename, description, and GPS coordinates
- Uses reverse geocoding to convert coordinates into place-aware location context
- Infers time-of-day lighting from capture timestamps
- Infers seasonal context from calendar month
- Generates concise atmosphere-aware text prompts for Marble
- Includes fallback prompt generation if enhancement services are unavailable

This makes world generation feel dramatically more intentional, grounded, and cinematic.

### 6. 3D World Generation Pipeline

SceneForge turns selected photos into interactive 3D worlds using the World Labs Marble API.

- World generation from photo URLs
- Support for enhanced text prompts alongside image prompts
- Automatic operation polling after generation starts
- Database persistence for generated world records
- Thumbnail, panorama, caption, and splat asset capture
- Completed-world response payloads ready for direct viewing in the UI
- External “Open in Marble” launch path for expanded exploration

### 7. Progressive Gaussian Splat Rendering

Generated worlds are not treated like static embeds. SceneForge renders them natively in-browser for a premium spatial playback experience.

- SparkJS-powered Gaussian splat rendering
- Three.js scene orchestration
- Progressive resolution loading across `100k`, `500k`, and `full_res` splats
- Automatic mesh replacement as quality increases
- Thumbnail-backed loading states for smoother perceived performance
- Orbit controls with damping, zoom, pan, and auto-rotation
- Error fallback path when a splat fails to load

### 8. Real-Time Scene Mood Editing

Once a world is generated, SceneForge lets users art-direct the atmosphere live.

- Natural-language scene editing bar
- Preset mood transformations such as `Sunset`, `Night`, `Dreamy`, `Rain`, `Vintage`, and `Reset`
- Freeform text commands like “make it a rainy evening”
- Optional browser speech recognition for spoken scene edits
- AI-generated scene parameter outputs in structured JSON
- Live updates to:
  - Background color
  - Ambient light color
  - Ambient light intensity
  - Splat tint
  - Splat opacity
  - Fog color
  - Fog density

This creates a second interaction layer beyond reconstruction: users can reinterpret a memory, not just revisit it.

### 9. Cinematic Memory Presentation

SceneForge is built to make generated memories feel premium and emotionally charged.

- Fullscreen world lightbox
- Hover-driven caption reveal for memory reconstructions
- Thumbnail-first preview cards
- Immersive “Step Into Memory” call to action
- Visual loading states during reconstruction and world refinement
- Atmospheric glassmorphism interface styling
- Suggestion prompts embedded directly into the landing experience

### 10. Spatial and XR Readiness

The app is built with spatial computing ambitions, not just conventional 2D web usage.

- WebSpatial packages included in the app stack
- Spatial runtime detection support
- Dedicated spatial dev and build scripts
- XR-enabled class hooks in the interface
- Early VR session support in the world viewer pipeline

### 11. Location-Aware Memory Exploration

When photo coordinates are available, SceneForge can map memory geography into an interactive globe experience.

- 3D globe view built with Three.js
- Latitude / longitude projection onto a sphere
- Animated memory pins for geo-tagged photos
- Hover and click interactions for mapped memories
- Live count of mapped locations vs. total memories

### 12. MCP Server for External AI Clients

SceneForge is not limited to its own UI. It can expose the memory archive as a tool layer for external AI systems.

- Custom MCP server over stdio
- Compatible with Claude Desktop and other MCP clients
- Memory search tool
- Memory listing tool
- Memory detail lookup tool
- Marble world generation tool

This makes SceneForge more than an app. It becomes a portable memory intelligence layer.

## Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                       │
│                                                               │
│  Photo Upload · Archive Drawer · Voice Orb · Example Vaults   │
│  World Viewer · Scene Mood Editor · Spatial/XR Hooks          │
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────┴────────────────────────────────┐
│                     API + Orchestration Layer                  │
│                                                               │
│  /api/upload-photos      EXIF + image processing + storage    │
│  /api/photos             archive retrieval and search         │
│  /api/generate-world     prompt enhancement + Marble polling  │
│  /api/scene-edit         AI-driven mood editing               │
│  /api/connection-details LiveKit token/session bootstrapping  │
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────┴────────────────────────────────┐
│                       Voice Agent Layer                        │
│                                                               │
│  LiveKit Agents + Deepgram STT + OpenAI LLM + OpenAI TTS      │
│  Tools: search_memories · generate_world · check_world_status │
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────┴────────────────────────────────┐
│                     Data + Generation Layer                    │
│                                                               │
│  Supabase Storage + Postgres                                  │
│  Reverse Geocoding                                             │
│  Featherless prompt enhancement                                │
│  World Labs Marble world generation                            │
│  SparkJS / Three.js rendering                                  │
└───────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Realtime Voice:** LiveKit Agents + LiveKit Components
- **Speech-to-Text:** Deepgram Nova-3
- **LLM / Agent Reasoning:** OpenAI GPT-4o
- **Text-to-Speech:** OpenAI TTS-1
- **Prompt Enrichment / Scene Editing:** Featherless-hosted Qwen 2.5 72B
- **3D Generation:** World Labs Marble API
- **3D Rendering:** SparkJS + Three.js
- **Storage / Database:** Supabase Storage + Supabase Postgres
- **Metadata Processing:** Sharp + Exifr
- **Protocol Layer:** Model Context Protocol (MCP)
- **Spatial Tooling:** WebSpatial SDK

## What Happens End to End

1. A user uploads one or more photos.
2. SceneForge extracts metadata such as date, device, dimensions, and GPS coordinates.
3. The photos are stored in Supabase and indexed in the archive.
4. The user can browse the archive manually or ask for a memory by voice.
5. The memory agent searches the archive and identifies the best matching photo.
6. SceneForge enriches the generation prompt using temporal and geographic context.
7. The selected photo is sent to Marble for 3D world reconstruction.
8. The app polls until the world, caption, thumbnail, and splat assets are ready.
9. The generated world is streamed into the in-browser viewer with progressive detail.
10. The user can reopen it fullscreen, apply mood edits, and continue exploring.

## Database Model

### `photos`

Stores the canonical memory archive.

- Original and processed filenames
- Capture date
- Description
- Tags
- Width and height
- Location name and coordinates
- Camera make and model
- Upload timestamps
- Public storage URL

### `worlds`

Stores reconstruction outputs tied to source memories.

- Display name
- Marble world URL
- Generation status
- Operation ID
- Thumbnail URL
- Panorama URL
- Caption
- Linked source photo
- Asset metadata for splat variants

## Environment Variables

Create `.env.local` and configure the following:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

OPENAI_API_KEY=
DEEPGRAM_API_KEY=
MARBLE_API_KEY=
FEATHERLESS_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

Run the schema in [`supabase/schema.sql`](/Users/aryanraut/Desktop/clean proj/SceneForge/supabase/schema.sql) and create a storage bucket named `memories`.

### 3. Add environment variables

Populate `.env.local` with the required API keys and service credentials.

### 4. Start the app

The default dev script launches both the frontend and the voice agent together:

```bash
pnpm dev
```

If you want to run them separately:

```bash
pnpm dev:next
pnpm agent:dev
```

### 5. Open the app

Visit `http://localhost:3000`.

Suggested flow:

1. Upload photos into the archive.
2. Open a voice session or browse the vault manually.
3. Generate a world from a selected memory.
4. Open the world fullscreen and apply mood edits.

## Available Scripts

```bash
pnpm dev            # frontend + voice agent
pnpm dev:next       # frontend only
pnpm dev:spatial    # frontend in spatial mode
pnpm build          # production build
pnpm build:spatial  # production build with spatial variant
pnpm start          # start production app
pnpm agent:dev      # run LiveKit agent in dev mode
pnpm agent:start    # run LiveKit agent in start mode
pnpm mcp:start      # run MCP server
```

## MCP Server

SceneForge can be mounted as an MCP server for Claude Desktop or any MCP-compatible client.

Start it with:

```bash
pnpm mcp:start
```

### Tools Exposed

- `search_memories`
- `list_all_memories`
- `get_memory_details`
- `generate_marble_world`

### Example Claude Desktop Config

```json
{
  "mcpServers": {
    "sceneforge": {
      "command": "node",
      "args": ["--import", "tsx", "mcp-server/index.ts"],
      "cwd": "/path/to/SceneForge",
      "env": {
        "MARBLE_API_KEY": "your_key",
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Product Positioning

SceneForge sits at the intersection of:

- personal knowledge systems
- spatial computing
- memory retrieval
- voice-native interfaces
- generative worldbuilding

It is not just a gallery, not just an AI agent, and not just a 3D demo.

It is a prototype for a new kind of interface where your personal archive becomes navigable, conversational, and spatial.

## License

MIT
