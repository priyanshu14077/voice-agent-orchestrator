export interface CollectionsIntentEvent {
  type: "INTENT_REPORTED";
  intent: string;
  transcript: string;
  entities?: {
    amount?: number | null;
    date?: string | null;
    language?: "en" | "hi" | null;
  };
}

export interface LlmOutput {
  response: string;
  intent: string;
  entities: {
    amount?: number | null;
    date?: string | null;
    language?: "en" | "hi" | null;
  };
  tool?: "log_promise_to_pay" | "schedule_followup" | "flag_dispute" | null;
}

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

export type VoiceEvent =
  | { type: "SPEECH_START"; timestamp: number }
  | { type: "SPEECH_END"; timestamp: number }
  | { type: "TRANSCRIPT_PARTIAL"; text: string; timestamp: number }
  | { type: "TRANSCRIPT_FINAL"; text: string; timestamp: number };

const collectionsInitialState = "greeting";

const collectionsTransitionTable: Record<string, Record<string, string>> = {
  greeting: {
    WILL_PAY: "promise_to_pay",
    HESITANT: "situation_assessment",
    DISPUTE: "escalation",
    NO_RESPONSE: "voicemail"
  },
  situation_assessment: {
    WILL_PAY: "repayment_offer",
    HESITANT: "negotiation",
    DISPUTE: "escalation"
  },
  negotiation: {
    WILL_PAY: "promise_to_pay"
  }
};

const resolveCollectionsState = (currentState: string, event: CollectionsIntentEvent): string => {
  const byIntent = collectionsTransitionTable[currentState];
  return byIntent?.[event.intent] ?? currentState;
};

export interface OrchestratorDependencies {
  llm: { generateStructuredResponse(input: unknown): Promise<LlmOutput> };
  toolRunner: { run(output: LlmOutput, session: SessionState): Promise<unknown> };
  tts: {
    speak(callId: string, text: string): Promise<Uint8Array>;
    interrupt(callId: string): Promise<void>;
  };
}

export class Orchestrator {
  constructor(private deps: OrchestratorDependencies) {}

  async handle(event: VoiceEvent, session: SessionState): Promise<SessionState> {
    session.updatedAt = Date.now();

    if (event.type === "SPEECH_START") {
      await this.deps.tts.interrupt(session.callId);
      return session;
    }

    if (event.type === "TRANSCRIPT_PARTIAL") {
      session.partialTranscript = event.text;
      return session;
    }

    if (event.type === "SPEECH_END") {
      session.lastSpeechAt = event.timestamp;
      return session;
    }

    if (event.type !== "TRANSCRIPT_FINAL") {
      return session;
    }

    session.partialTranscript = "";
    session.lastSpeechAt = event.timestamp;
    session.transcripts.push(`user: ${event.text}`);

    const llmOutput = await this.deps.llm.generateStructuredResponse({
      transcript: event.text,
      state: session.state,
      session
    });

    const intentEvent: CollectionsIntentEvent = {
      type: "INTENT_REPORTED",
      intent: llmOutput.intent,
      transcript: event.text,
      entities: llmOutput.entities
    };

    session.state = resolveCollectionsState(session.state, intentEvent);

    if (intentEvent.entities?.language) {
      session.language = intentEvent.entities.language;
    }

    session.transcripts.push(`agent: ${llmOutput.response}`);

    await this.deps.toolRunner.run(llmOutput, session);
    await this.deps.tts.speak(session.callId, llmOutput.response);

    return session;
  }
}