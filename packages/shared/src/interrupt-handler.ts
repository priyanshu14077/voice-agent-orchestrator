export interface InterruptContext {
  callId: string;
  interruptedAt: number;
  audioPlayedMs: number;
}

export type InterruptHandler = (context: InterruptContext) => Promise<void>;

export class InterruptManager {
  private readonly handlers: InterruptHandler[] = [];
  private activeInterrupts = new Map<string, InterruptContext>();

  register(handler: InterruptHandler): void {
    this.handlers.push(handler);
  }

  async onSpeechStart(callId: string, audioPlayedMs: number): Promise<void> {
    const context: InterruptContext = {
      callId,
      interruptedAt: Date.now(),
      audioPlayedMs
    };

    this.activeInterrupts.set(callId, context);

    for (const handler of this.handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error("[interrupt:handler:error]", error);
      }
    }
  }

  getActiveInterrupt(callId: string): InterruptContext | undefined {
    return this.activeInterrupts.get(callId);
  }

  clearInterrupt(callId: string): void {
    this.activeInterrupts.delete(callId);
  }

  hasActiveInterrupt(callId: string): boolean {
    return this.activeInterrupts.has(callId);
  }
}

export const createInterruptManager = (): InterruptManager => {
  return new InterruptManager();
};