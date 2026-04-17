export type VoiceEvent =
  | { type: "SPEECH_START"; timestamp: number }
  | { type: "SPEECH_END"; timestamp: number }
  | { type: "TRANSCRIPT_PARTIAL"; text: string; timestamp: number }
  | { type: "TRANSCRIPT_FINAL"; text: string; timestamp: number }
  | { type: "LLM_RESPONSE"; payload: unknown; timestamp: number }
  | { type: "TTS_CHUNK"; audio: unknown; timestamp: number };

export interface SessionState {
  callId: string;
  state: string;
  transcripts: string[];
  partialTranscript: string;
  language: "en" | "hi";
  lastSpeechAt: number;
  createdAt: number;
  updatedAt: number;
}

export type EventHandler = (event: VoiceEvent, session: SessionState) => Promise<SessionState>;

export interface EventRouterOptions {
  onTranscript?: (event: { type: "TRANSCRIPT_FINAL"; text: string; timestamp: number }, session: SessionState) => Promise<void>;
  onSpeechStart?: (event: { type: "SPEECH_START"; timestamp: number }, session: SessionState) => Promise<void>;
  onSpeechEnd?: (event: { type: "SPEECH_END"; timestamp: number }, session: SessionState) => Promise<void>;
  onPartial?: (event: { type: "TRANSCRIPT_PARTIAL"; text: string; timestamp: number }, session: SessionState) => Promise<void>;
}

export class EventRouter {
  private readonly handlers: Map<string, EventHandler> = new Map();
  private readonly options: EventRouterOptions;

  constructor(options: EventRouterOptions = {}) {
    this.options = options;
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register("TRANSCRIPT_FINAL", async (event, session) => {
      const e = event as { type: "TRANSCRIPT_FINAL"; text: string; timestamp: number };
      await this.options.onTranscript?.(e, session);
      return session;
    });

    this.register("TRANSCRIPT_PARTIAL", async (event, session) => {
      await this.options.onPartial?.(event as any, session);
      session.partialTranscript = (event as any).text;
      return session;
    });

    this.register("SPEECH_START", async (event, session) => {
      await this.options.onSpeechStart?.(event as any, session);
      return session;
    });

    this.register("SPEECH_END", async (event, session) => {
      await this.options.onSpeechEnd?.(event as any, session);
      return session;
    });
  }

  register(eventType: string, handler: EventHandler): void {
    this.handlers.set(eventType, handler);
  }

  async route(event: VoiceEvent, session: SessionState): Promise<SessionState> {
    const handler = this.handlers.get(event.type);

    if (!handler) {
      console.warn(`[event-router] no handler for event type: ${event.type}`);
      return session;
    }

    try {
      return await handler(event, session);
    } catch (error) {
      console.error(`[event-router] handler error for ${event.type}:`, error);
      return session;
    }
  }

  hasHandler(eventType: string): boolean {
    return this.handlers.has(eventType);
  }

  getHandler(eventType: string): EventHandler | undefined {
    return this.handlers.get(eventType);
  }
}

export const createEventRouter = (options?: EventRouterOptions): EventRouter => {
  return new EventRouter(options);
};