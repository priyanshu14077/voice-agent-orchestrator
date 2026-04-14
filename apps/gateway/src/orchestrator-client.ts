import { WebSocket, type RawData } from "ws";

import type { SessionState, VoiceEvent } from "@voice-agent/shared";

export interface OrchestratorWireMessage {
  event: VoiceEvent;
  session: SessionState;
}

export interface OrchestratorWebSocketClientOptions {
  url?: string;
  headers?: Record<string, string>;
  onMessage?: (payload: unknown) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class OrchestratorWebSocketClient {
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly queue: string[] = [];

  constructor(private readonly options: OrchestratorWebSocketClientOptions = {}) {}

  async connect(): Promise<void> {
    await this.ensureConnected();
  }

  async sendEvent(event: VoiceEvent, session: SessionState): Promise<void> {
    await this.send({ event, session });
  }

  async send(payload: unknown): Promise<void> {
    if (!this.options.url) {
      return;
    }

    await this.ensureConnected();

    const message = JSON.stringify(payload);
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.queue.push(message);
      return;
    }

    socket.send(message);
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
    if (!this.options.url) {
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
      const socket = new WebSocket(this.options.url as string, {
        headers: this.options.headers
      });

      let opened = false;

      socket.on("open", () => {
        opened = true;
        this.socket = socket;
        this.flushQueue();
        this.options.onOpen?.();
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
        this.options.onClose?.();
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
      const message = this.queue.shift();
      if (message) {
        socket.send(message);
      }
    }
  }

  private handleMessage(raw: RawData): void {
    try {
      const payload = this.parseMessage(raw);
      if (payload === null) {
        return;
      }

      this.options.onMessage?.(payload);
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private parseMessage(raw: RawData): unknown {
    const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : Buffer.from(raw).toString("utf8");
    return JSON.parse(text) as unknown;
  }
}
