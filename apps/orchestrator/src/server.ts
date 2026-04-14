import { createServer } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import "dotenv/config";

import { Orchestrator } from "./orchestrator.js";
import { EventRouter } from "./event-router.js";
import { ElevenLabsClient } from "./tts/eleven-labs-client.js";
import { GroqLlmClient } from "./llm/groq-client.js";
import { ToolRunner } from "./tool-runner.js";
import type { VoiceEvent, SessionState } from "@voice-agent/shared";

interface OrchestratorMessage {
  event: VoiceEvent;
  session: SessionState;
}

interface GatewayMessage {
  type: string;
  callId: string;
  [key: string]: unknown;
}

export interface OrchestratorServerOptions {
  port: number;
  llm?: {
    apiKey?: string;
    model?: string;
  };
  tts?: {
    apiKey?: string;
    voiceId?: string;
    modelId?: string;
  };
}

export class OrchestratorServer {
  private readonly wss: WebSocketServer;
  private readonly orchestrator: Orchestrator;
  private readonly tts: ElevenLabsClient;
  private readonly sessions = new Map<string, SessionState>();

  constructor(private readonly options: OrchestratorServerOptions) {
    const llm = new GroqLlmClient(options.llm?.apiKey ?? "", options.llm?.model);
    const toolRunner = new ToolRunner();
    this.tts = new ElevenLabsClient(options.tts);

    this.orchestrator = new Orchestrator({
      llm,
      toolRunner,
      tts: {
        speak: (callId, text) => this.handleSpeak(callId, text),
        interrupt: (callId) => this.handleInterrupt(callId)
      }
    });

    this.wss = new WebSocketServer({ port: options.port });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on("connection", (socket, request) => {
      console.log("[orchestrator] client connected");

      socket.on("message", (raw) => {
        void this.handleMessage(socket, raw);
      });

      socket.on("close", () => {
        console.log("[orchestrator] client disconnected");
      });

      socket.on("error", (error) => {
        console.error("[orchestrator:socket:error]", error);
      });
    });

    const server = createServer();
    server.on("upgrade", (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
    });

    server.listen(this.options.port, () => {
      console.log(`[orchestrator] WebSocket server listening on :${this.options.port}`);
    });
  }

  private async handleMessage(socket: WebSocket, raw: RawData): Promise<void> {
    try {
      const message = this.parseMessage(raw);
      if (!message || !message.event || !message.session) {
        return;
      }

      const { event, session } = message as OrchestratorMessage;
      this.sessions.set(session.callId, session);

      const updatedSession = await this.orchestrator.handle(event, session);
      this.sessions.set(session.callId, updatedSession);

      this.sendToGateway(socket, {
        type: "SESSION_UPDATE",
        session: updatedSession
      });

      if (event.type === "TRANSCRIPT_FINAL" || event.type === "SPEECH_START") {
        // Response will be sent via TTS stream
      }
    } catch (error) {
      console.error("[orchestrator:handle:error]", error);
    }
  }

  private async handleSpeak(callId: string, text: string): Promise<void> {
    const sockets = this.getGatewaySockets();
    if (sockets.length === 0) {
      console.warn("[orchestrator] no gateway connected to send TTS");
      return;
    }

    try {
      const response = await this.tts.speak(callId, text);
      const audioBase64 = response.audio.toString("base64");

      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "AUDIO_OUT",
              callId,
              audio: audioBase64
            })
          );
        }
      }
    } catch (error) {
      console.error("[orchestrator:tts:error]", error);
    }
  }

  private async handleInterrupt(callId: string): Promise<void> {
    await this.tts.interrupt(callId);

    const sockets = this.getGatewaySockets();
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "INTERRUPT",
            callId
          })
        );
      }
    }
  }

  private getGatewaySockets(): WebSocket[] {
    const sockets: WebSocket[] = [];
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        sockets.push(client);
      }
    });
    return sockets;
  }

  private sendToGateway(socket: WebSocket, payload: unknown): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  private parseMessage(raw: RawData): unknown {
    try {
      const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : Buffer.from(raw).toString("utf8");
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

const port = Number(process.env.ORCHESTRATOR_PORT ?? 8090);
const orchestrator = new OrchestratorServer({
  port,
  llm: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL
  },
  tts: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    modelId: process.env.ELEVENLABS_MODEL_ID
  }
});