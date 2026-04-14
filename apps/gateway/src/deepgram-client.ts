import { WebSocket, type RawData } from "ws";

interface DeepgramResultMessage {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
    }>;
  };
}

export interface DeepgramTranscriptEvent {
  text: string;
  raw: DeepgramResultMessage;
}

export interface DeepgramStreamingClientOptions {
  apiKey?: string;
  url?: string;
  model?: string;
  encoding?: string;
  sampleRate?: number;
  channels?: number;
  endpointingMs?: number;
  utteranceEndMs?: number;
  onPartial?: (event: DeepgramTranscriptEvent) => void;
  onFinal?: (event: DeepgramTranscriptEvent) => void;
  onError?: (error: Error) => void;
}

export class DeepgramStreamingClient {
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly queue: Buffer[] = [];

  constructor(private readonly options: DeepgramStreamingClientOptions = {}) {}

  async connect(): Promise<void> {
    await this.ensureConnected();
  }

  async sendAudio(chunk: Buffer): Promise<void> {
    if (!this.options.apiKey) {
      return;
    }

    await this.ensureConnected();
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.queue.push(chunk);
      return;
    }

    socket.send(chunk, { binary: true });
  }

  async close(): Promise<void> {
    this.queue.length = 0;

    const socket = this.socket;
    this.socket = null;
    this.connectPromise = null;

    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.options.apiKey) {
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = new Promise<void>((resolve) => {
      const socket = new WebSocket(this.buildUrl(), {
        headers: {
          Authorization: `Token ${this.options.apiKey}`
        }
      });

      let opened = false;

      socket.on("open", () => {
        opened = true;
        this.socket = socket;
        this.flushQueue();
        resolve();
      });

      socket.on("message", (raw) => {
        this.handleMessage(raw);
      });

      socket.on("error", (error) => {
        const normalized = error instanceof Error ? error : new Error(String(error));
        this.options.onError?.(normalized);
        if (!opened) {
          this.socket = null;
          this.connectPromise = null;
          resolve();
        }
      });

      socket.on("close", () => {
        if (this.socket === socket) {
          this.socket = null;
        }

        this.connectPromise = null;
      });
    });

    await this.connectPromise;
    this.connectPromise = null;
  }

  private flushQueue(): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.queue.length > 0) {
      const chunk = this.queue.shift();
      if (chunk) {
        socket.send(chunk, { binary: true });
      }
    }
  }

  private handleMessage(raw: RawData): void {
    try {
      const payload = this.parseMessage(raw);
      if (!payload || payload.type !== "Results") {
        return;
      }

      const text = payload.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
      if (!text) {
        return;
      }

      const event = {
        text,
        raw: payload
      };

      if (payload.is_final || payload.speech_final) {
        this.options.onFinal?.(event);
        return;
      }

      this.options.onPartial?.(event);
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private parseMessage(raw: RawData): DeepgramResultMessage | null {
    const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : Buffer.from(raw).toString("utf8");

    try {
      return JSON.parse(text) as DeepgramResultMessage;
    } catch {
      return null;
    }
  }

  private buildUrl(): string {
    const url = new URL(this.options.url ?? "wss://api.deepgram.com/v1/listen");

    url.searchParams.set("model", this.options.model ?? "nova-2");
    url.searchParams.set("encoding", this.options.encoding ?? "mulaw");
    url.searchParams.set("sample_rate", String(this.options.sampleRate ?? 8000));
    url.searchParams.set("channels", String(this.options.channels ?? 1));
    url.searchParams.set("interim_results", "true");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("vad_events", "true");
    url.searchParams.set("endpointing", String(this.options.endpointingMs ?? 500));
    url.searchParams.set("utterance_end_ms", String(this.options.utteranceEndMs ?? 500));

    return url.toString();
  }
}
