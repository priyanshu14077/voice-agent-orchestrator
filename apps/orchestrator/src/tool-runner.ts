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

export interface ToolResult {
  ok: boolean;
  tool: string;
  payload: Record<string, unknown>;
}

export class ToolRunner {
  async run(output: LlmOutput, session: SessionState): Promise<ToolResult | null> {
    if (!output.tool) {
      return null;
    }

    switch (output.tool) {
      case "log_promise_to_pay":
        return {
          ok: true,
          tool: output.tool,
          payload: {
            callId: session.callId,
            amount: output.entities.amount ?? null,
            date: output.entities.date ?? null
          }
        };
      case "schedule_followup":
        return {
          ok: true,
          tool: output.tool,
          payload: {
            callId: session.callId,
            nextAttemptAt: output.entities.date ?? null
          }
        };
      case "flag_dispute":
        return {
          ok: true,
          tool: output.tool,
          payload: {
            callId: session.callId,
            dispute: true
          }
        };
      default:
        return null;
    }
  }
}