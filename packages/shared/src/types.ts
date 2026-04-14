export type Intent =
  | "WILL_PAY"
  | "HESITANT"
  | "DISPUTE"
  | "NO_RESPONSE"
  | "LANGUAGE_SWITCH"
  | "UNKNOWN";

export type CollectionsStateId =
  | "greeting"
  | "situation_assessment"
  | "repayment_offer"
  | "negotiation"
  | "promise_to_pay"
  | "escalation"
  | "voicemail"
  | "language_switch";

export interface SessionState {
  callId: string;
  state: CollectionsStateId;
  transcripts: string[];
  partialTranscript: string;
  language: "en" | "hi";
  lastSpeechAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface LlmOutput {
  response: string;
  intent: Intent;
  entities: {
    amount?: number | null;
    date?: string | null;
    language?: "en" | "hi" | null;
  };
  tool?: "log_promise_to_pay" | "schedule_followup" | "flag_dispute" | null;
}

export interface ToolResult {
  ok: boolean;
  tool: NonNullable<LlmOutput["tool"]>;
  payload: Record<string, unknown>;
}
