# Memory Reliver

**Relive your memories as explorable 3D worlds — powered by voice AI**

Talk to your memories. Upload photos from your life, then ask the voice agent:
_"What was I doing on December 1st, 2009?"_ — and watch as your photos transform into
immersive 3D worlds you can explore.

Built for **Worlds in Action Hack SF 2026**.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Next.js Frontend                  │
│  Photo Upload · Voice UI · 3D World Viewer  │
│         (SparkJS 2.0 + Three.js)            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│         LiveKit Voice Agent                  │
│    STT (Deepgram) → LLM (GPT-4o) → TTS     │
│                                              │
│    Tools:                                    │
│    · search_memories → Photo Store           │
│    · generate_world → Marble API             │
│    · check_world_status → Poll Marble        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│          MCP Server                          │
│    Exposes photo search + Marble world       │
│    generation as MCP tools                   │
│    (Works with Claude Desktop, AI SDK)       │
└─────────────────────────────────────────────┘
```

## Tech Stack

- **Voice**: LiveKit Agents (STT → LLM → TTS)
- **LLM**: OpenAI GPT-4o with function calling
- **3D Worlds**: World Labs Marble API
- **3D Rendering**: SparkJS 2.0 (Gaussian splatting) + Three.js
- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **MCP**: Custom MCP server + Vercel AI SDK integration
- **Photos**: EXIF date extraction, full-text search

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
# Fill in your API keys
```

Required keys:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — [LiveKit Cloud](https://cloud.livekit.io)
- `OPENAI_API_KEY` — [OpenAI](https://platform.openai.com)
- `MARBLE_API_KEY` — [World Labs Platform](https://platform.worldlabs.ai)
- `DEEPGRAM_API_KEY` — [Deepgram](https://console.deepgram.com)

### 3. Run the app (two terminals)

**Terminal 1 — Next.js frontend:**
```bash
pnpm dev
```

**Terminal 2 — LiveKit voice agent:**
```bash
pnpm agent:dev
```

### 4. Open http://localhost:3000

1. Upload photos (EXIF dates extracted automatically)
2. Click "Start Talking"
3. Ask about your memories!

## MCP Server

The Memory Reliver also exposes an MCP server for use with Claude Desktop or any MCP client:

```bash
pnpm mcp:start
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "memory-reliver": {
      "command": "node",
      "args": ["--import", "tsx", "mcp-server/index.ts"],
      "cwd": "/path/to/WorldHack",
      "env": {
        "MARBLE_API_KEY": "your_key",
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

Available MCP tools:
- `search_memories` — Search photos by date/description/keywords
- `list_all_memories` — List all uploaded photos
- `get_memory_details` — Get details about a specific photo
- `generate_marble_world` — Generate a 3D world from a photo

## How It Works

1. **Upload**: Drop in personal photos → EXIF dates extracted automatically
2. **Voice**: Click the mic → speak naturally about a memory
3. **Search**: Agent searches your photos by date, description, or keywords
4. **Generate**: Matching photos are sent to Marble API for 3D world creation
5. **Explore**: Navigate the generated Gaussian splat world in your browser

## License

MIT
