import "dotenv/config";

import { WebSocketServer } from "ws";

import type { SessionState, TranscriptFinalEvent, VoiceEvent } from "@voice-agent/shared";

import { GroqLlmClient } from "./llm/groq-client.js";
import { Orchestrator } from "./orchestrator.js";
import { ToolRunner } from "./tool-runner.js";

const port = Number(process.env.ORCHESTRATOR_PORT ?? 8090);

const llm = new GroqLlmClient(process.env.GROQ_API_KEY ?? "", process.env.GROQ_MODEL);
const orchestrator = new Orchestrator({
  llm,
  toolRunner: new ToolRunner(),
  tts: {
    async speak(callId, text) {
      console.log("[tts]", callId, text);
    },
    async interrupt(callId) {
      console.log("[tts:interrupt]", callId);
    }
  }
});

const wss = new WebSocketServer({ port });

type OrchestratorInboundMessage =
  | {
      type?: "VOICE_EVENT";
      event: VoiceEvent;
      session: SessionState;
    }
  | {
      event: VoiceEvent;
      session: SessionState;
    };

const parseInboundMessage = (raw: string): OrchestratorInboundMessage | null => {
  try {
    return JSON.parse(raw) as OrchestratorInboundMessage;
  } catch {
    return null;
  }
};

wss.on("connection", (socket) => {
  socket.on("message", async (raw) => {
    const payload = parseInboundMessage(raw.toString());

    if (!payload || !payload.event || !payload.session) {
      socket.send(JSON.stringify({ type: "ERROR", message: "Invalid orchestrator payload" }));
      return;
    }

    try {
      const updatedSession = await orchestrator.handle(payload.event, payload.session);
      socket.send(JSON.stringify({ type: "SESSION_UPDATE", session: updatedSession }));
    } catch (error) {
      socket.send(
        JSON.stringify({
          type: "ERROR",
          message: error instanceof Error ? error.message : "Orchestrator turn failed"
        })
      );
    }
  });
});

console.log(`[orchestrator] listening on :${port}`);

// Keep one typed example in place so the package compiles with strict settings.
const _example: TranscriptFinalEvent = {
  type: "TRANSCRIPT_FINAL",
  text: "I will pay tomorrow",
  timestamp: Date.now()
};
void _example;
