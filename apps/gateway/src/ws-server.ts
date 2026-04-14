import { createServer } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";

import type {
  SessionState,
  SpeechEndEvent,
  SpeechStartEvent,
  TranscriptFinalEvent,
  TranscriptPartialEvent,
  VoiceEvent
} from "@voice-agent/shared";

import { DeepgramStreamingClient, type DeepgramTranscriptEvent } from "./deepgram-client.js";
import { OrchestratorWebSocketClient } from "./orchestrator-client.js";
import { SessionManager } from "./session-manager.js";
import { VadHttpClient, type VadDetectionResult } from "./vad-client.js";

type TelephonyInboundMessage =
  | { type: "AUDIO_CHUNK"; audio: string; frameMs?: number }
  | { type: "CONTROL"; name: "speech_start" | "speech_end" };

interface CallRuntime {
  session: SessionState;
  socket: WebSocket;
  deepgram: DeepgramStreamingClient;
  orchestrator: OrchestratorWebSocketClient;
  vad: VadHttpClient;
  speaking: boolean;
  silenceMs: number;
}

export interface GatewayServerOptions {
  port: number;
  deepgram?: {
    apiKey?: string;
    url?: string;
    model?: string;
    encoding?: string;
    sampleRate?: number;
    channels?: number;
    endpointingMs?: number;
    utteranceEndMs?: number;
  };
  vad?: {
    baseUrl?: string;
    timeoutMs?: number;
  };
  orchestrator?: {
    url?: string;
    headers?: Record<string, string>;
  };
  vadSilenceMs?: number;
}

export class GatewayServer {
  private readonly sessions = new SessionManager();
  private readonly clients = new Map<string, WebSocket>();
  private readonly runtimes = new Map<string, CallRuntime>();

  constructor(private readonly options: GatewayServerOptions) {}

  start(): void {
    const server = createServer();
    const wss = new WebSocketServer({ server });

    wss.on("connection", (socket) => {
      const session = this.sessions.create();
      this.clients.set(session.callId, socket);

      const runtime = this.createRuntime(session, socket);
      this.runtimes.set(session.callId, runtime);

      socket.on("message", (raw) => {
        void this.handleTelephonyMessage(session.callId, raw);
      });

      socket.on("close", () => {
        void this.cleanup(session.callId);
      });

      socket.on("error", (error) => {
        console.error("[gateway:socket:error]", session.callId, error);
      });

      this.sendMessage(session.callId, {
        type: "SESSION_STARTED",
        callId: session.callId,
        state: session.state
      });
    });

    server.listen(this.options.port, () => {
      console.log(`[gateway] listening on :${this.options.port}`);
    });
  }

  sendAudio(callId: string, audio: Buffer): void {
    this.sendMessage(callId, {
      type: "AUDIO_OUT",
      audio: audio.toString("base64")
    });
  }

  sendMessage(callId: string, payload: Record<string, unknown>): void {
    const socket = this.clients.get(callId);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  private createRuntime(session: SessionState, socket: WebSocket): CallRuntime {
    const runtime: CallRuntime = {
      session,
      socket,
      speaking: false,
      silenceMs: 0,
      deepgram: new DeepgramStreamingClient({
        apiKey: this.options.deepgram?.apiKey,
        url: this.options.deepgram?.url,
        model: this.options.deepgram?.model,
        encoding: this.options.deepgram?.encoding,
        sampleRate: this.options.deepgram?.sampleRate,
        channels: this.options.deepgram?.channels,
        endpointingMs: this.options.deepgram?.endpointingMs ?? 500,
        utteranceEndMs: this.options.deepgram?.utteranceEndMs ?? 500,
        onPartial: (event) => {
          void this.handleTranscriptPartial(session.callId, event);
        },
        onFinal: (event) => {
          void this.handleTranscriptFinal(session.callId, event);
        },
        onError: (error) => {
          console.error("[gateway:deepgram:error]", session.callId, error);
        }
      }),
      vad: new VadHttpClient({
        baseUrl: this.options.vad?.baseUrl,
        timeoutMs: this.options.vad?.timeoutMs
      }),
      orchestrator: new OrchestratorWebSocketClient({
        url: this.options.orchestrator?.url,
        headers: this.options.orchestrator?.headers,
        onMessage: (payload) => {
          void this.handleOrchestratorMessage(session.callId, payload);
        },
        onError: (error) => {
          console.error("[gateway:orchestrator:error]", session.callId, error);
        }
      })
    };

    void runtime.deepgram.connect();
    void runtime.orchestrator.connect();
    return runtime;
  }

  private async handleTelephonyMessage(callId: string, raw: RawData): Promise<void> {
    const message = this.parseMessage(raw);
    if (!message) {
      return;
    }

    if (message.type === "AUDIO_CHUNK") {
      const audio = Buffer.from(message.audio, "base64");
      await this.handleAudioChunk(callId, audio, message.frameMs ?? 20);
      return;
    }

    if (message.type === "CONTROL") {
      if (message.name === "speech_start") {
        await this.handleSpeechStart(callId);
      } else {
        await this.handleSpeechEnd(callId);
      }
    }
  }

  private async handleAudioChunk(callId: string, audio: Buffer, frameMs: number): Promise<void> {
    const runtime = this.runtimes.get(callId);
    const session = this.sessions.get(callId);
    if (!runtime || !session) {
      return;
    }

    session.lastSpeechAt = Date.now();
    this.sessions.upsert(session);

    const vadResult = runtime.vad.detect(audio, frameMs);
    const sttResult = runtime.deepgram.sendAudio(audio);

    await Promise.allSettled([
      vadResult.then((result) => this.handleVadResult(callId, result, frameMs)),
      sttResult
    ]);
  }

  private async handleVadResult(
    callId: string,
    result: VadDetectionResult,
    frameMs: number
  ): Promise<void> {
    const runtime = this.runtimes.get(callId);
    if (!runtime) {
      return;
    }

    if (result.speech) {
      runtime.silenceMs = 0;
      if (!runtime.speaking) {
        runtime.speaking = true;
        await this.handleSpeechStart(callId);
      }
      return;
    }

    runtime.silenceMs += frameMs;
    if (runtime.speaking && runtime.silenceMs >= (this.options.vadSilenceMs ?? 500)) {
      runtime.speaking = false;
      runtime.silenceMs = 0;
      await this.handleSpeechEnd(callId);
    }
  }

  private async handleSpeechStart(callId: string): Promise<void> {
    const runtime = this.runtimes.get(callId);
    const session = this.sessions.get(callId);
    if (!runtime || !session) {
      return;
    }

    const event: SpeechStartEvent = {
      type: "SPEECH_START",
      timestamp: Date.now()
    };

    await runtime.orchestrator.sendEvent(event, session);
  }

  private async handleSpeechEnd(callId: string): Promise<void> {
    const runtime = this.runtimes.get(callId);
    const session = this.sessions.get(callId);
    if (!runtime || !session) {
      return;
    }

    const event: SpeechEndEvent = {
      type: "SPEECH_END",
      timestamp: Date.now()
    };

    await runtime.orchestrator.sendEvent(event, session);
  }

  private async handleTranscriptPartial(
    callId: string,
    event: DeepgramTranscriptEvent
  ): Promise<void> {
    const session = this.sessions.get(callId);
    if (!session) {
      return;
    }

    session.partialTranscript = event.text;
    this.sessions.upsert(session);
  }

  private async handleTranscriptFinal(callId: string, event: DeepgramTranscriptEvent): Promise<void> {
    const runtime = this.runtimes.get(callId);
    const session = this.sessions.get(callId);
    if (!runtime || !session) {
      return;
    }

    session.partialTranscript = "";
    session.transcripts.push(`user: ${event.text}`);
    this.sessions.upsert(session);

    const transcriptEvent: TranscriptFinalEvent = {
      type: "TRANSCRIPT_FINAL",
      text: event.text,
      timestamp: Date.now()
    };

    await runtime.orchestrator.sendEvent(transcriptEvent, session);
  }

  private async handleOrchestratorMessage(callId: string, payload: unknown): Promise<void> {
    const runtime = this.runtimes.get(callId);
    const session = this.sessions.get(callId);
    if (!runtime || !session || !this.isObjectRecord(payload)) {
      if (this.isObjectRecord(payload) && "type" in payload) {
        this.sendMessage(callId, payload);
      }
      return;
    }

    if ("session" in payload && this.isObjectRecord(payload.session)) {
      const nextSession = payload.session as SessionState;
      this.sessions.upsert(nextSession);
      this.sendMessage(callId, {
        type: "SESSION_UPDATE",
        session: nextSession
      });
      return;
    }

    this.sendMessage(callId, payload);
  }

  private async cleanup(callId: string): Promise<void> {
    const runtime = this.runtimes.get(callId);
    this.runtimes.delete(callId);
    this.clients.delete(callId);
    this.sessions.remove(callId);

    if (!runtime) {
      return;
    }

    await Promise.allSettled([
      runtime.deepgram.close(),
      runtime.orchestrator.close()
    ]);
  }

  private parseMessage(raw: RawData): TelephonyInboundMessage | null {
    try {
      const text = this.rawDataToString(raw);
      return JSON.parse(text) as TelephonyInboundMessage;
    } catch {
      return null;
    }
  }

  private rawDataToString(raw: RawData): string {
    if (typeof raw === "string") {
      return raw;
    }

    if (Array.isArray(raw)) {
      return Buffer.concat(raw).toString("utf8");
    }

    if (Buffer.isBuffer(raw)) {
      return raw.toString("utf8");
    }

    return Buffer.from(raw).toString("utf8");
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
}
