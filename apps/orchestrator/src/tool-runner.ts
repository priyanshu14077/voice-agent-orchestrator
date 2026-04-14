import type { LlmOutput, SessionState, ToolResult } from "@voice-agent/shared";

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
