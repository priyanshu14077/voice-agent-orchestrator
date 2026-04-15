# Voice Agent - Running the Project

## Prerequisites

1. **Node.js 18+** and **pnpm** installed
2. **Python 3.10+** with `uvicorn` for VAD service
3. **Redis** (optional, for production session storage)

## Quick Start

### 1. Install Dependencies

```bash
# Install JS dependencies
pnpm install
```

### 2. Environment Setup

Copy and configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Required
GROQ_API_KEY=your_groq_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Optional - uses defaults if not set
PORT=8080
ORCHESTRATOR_WS_URL=ws://localhost:8090
VAD_URL=http://localhost:8000
```

Get free API keys:
- **Groq**: https://console.groq.com/
- **Deepgram**: https://console.deepgram.com/

### 3. Start Services

#### Option A: All Services (Development)

```bash
pnpm dev
```

This starts:
- Gateway (port 8080)
- Orchestrator (port 8090)
- Worker (background jobs)

#### Option B: Manual Start

Terminal 1 - VAD Service:
```bash
cd apps/vad-service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 - Gateway:
```bash
cd apps/gateway
pnpm dev
```

Terminal 3 - Orchestrator:
```bash
cd apps/orchestrator
pnpm dev
```

### 4. Connect a Client

Use a WebSocket client to connect to `ws://localhost:8080`.

Send audio base64 encoded:

```json
{
  "type": "AUDIO_CHUNK",
  "audio": "base64_audio_data_here",
  "frameMs": 20
}
```

Send control signals:

```json
{"type": "CONTROL", "name": "speech_start"}
{"type": "CONTROL", "name": "speech_end"}
```

## Architecture Flow

```
[Client Audio] → [Gateway:8080] → [VAD + STT]
                                    ↓
                              [Events]
                                    ↓
                            [Orchestrator:8090]
                                    ↓
                         [XState → Groq LLM]
                                    ↓
                         [Tools + TTS Response]
                                    ↓
                              [Gateway]
                                    ↓
                            [Client receives audio]
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in dev mode |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type check all packages |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Gateway WebSocket port | 8080 |
| `ORCHESTRATOR_PORT` | Orchestrator port | 8090 |
| `GROQ_API_KEY` | **Required** - Groq API key | - |
| `GROQ_MODEL` | LLM model | llama-3.3-70b-versatile |
| `DEEPGRAM_API_KEY` | **Required** - Deepgram STT | - |
| `VAD_URL` | VAD service URL | http://localhost:8000 |
| `REDIS_URL` | Redis for sessions | redis://localhost:6379 |
| `ELEVENLABS_API_KEY` | TTS (optional) | - |

## Testing

Once running, connect a WebSocket client and send audio to test the pipeline.