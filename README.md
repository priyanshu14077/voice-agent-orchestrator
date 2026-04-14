# Voice Agent Monorepo

Real-time, event-driven AI voice agent scaffold for loan collection calls. The control plane is state-machine driven, with the LLM limited to structured response, intent, and entity extraction.

## Services

- `apps/gateway`: WebSocket gateway for inbound audio and outbound audio/control messages.
- `apps/orchestrator`: Event processor, Groq LLM client, tool runner, and transport bridge.
- `apps/vad-service`: FastAPI VAD stub for speech/no-speech decisions.
- `packages/shared`: Shared event, session, and payload types.
- `packages/state-machine`: XState collections flow and guard logic.

## Quick Start

1. Install JS dependencies with `pnpm install`.
2. Create a virtual env in `apps/vad-service` and install dependencies from `pyproject.toml`.
3. Copy `.env.example` to `.env` and set `GROQ_API_KEY`.
4. Run `pnpm dev` for the JS services.
5. Run the VAD service with `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` from `apps/vad-service`.

## Architecture

`Audio -> Gateway -> Events -> Orchestrator -> XState -> Groq -> Tools/TTS -> Gateway`

Key rule: the LLM suggests; the state machine decides.
# voice-agent-orchestrator
