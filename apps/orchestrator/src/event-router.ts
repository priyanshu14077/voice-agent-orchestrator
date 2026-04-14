import type {
  VoiceEvent,
  SessionState,
  TranscriptFinalEvent,
  TranscriptPartialEvent,
  SpeechStartEvent,
  SpeechEndEvent
} from "@voice-agent/shared";

export type EventHandler = (event: VoiceEvent, session: SessionState) => Promise<SessionState>;

export interface EventRouterOptions {
  onTranscript?: (event: TranscriptFinalEvent, session: SessionState) => Promise<void>;
  onSpeechStart?: (event: SpeechStartEvent, session: SessionState) => Promise<void>;
  onSpeechEnd?: (event: SpeechEndEvent, session: SessionState) => Promise<void>;
  onPartial?: (event: TranscriptPartialEvent, session: SessionState) => Promise<void>;
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
      await this.options.onTranscript?.(event as TranscriptFinalEvent, session);
      return session;
    });

    this.register("TRANSCRIPT_PARTIAL", async (event, session) => {
      await this.options.onPartial?.(event as TranscriptPartialEvent, session);
      session.partialTranscript = (event as TranscriptPartialEvent).text;
      return session;
    });

    this.register("SPEECH_START", async (event, session) => {
      await this.options.onSpeechStart?.(event as SpeechStartEvent, session);
      return session;
    });

    this.register("SPEECH_END", async (event, session) => {
      await this.options.onSpeechEnd?.(event as SpeechEndEvent, session);
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