import Groq from "groq-sdk";
import { z } from "zod";

import type { CollectionsStateId, LlmOutput, SessionState } from "@voice-agent/shared";

const schema = z.object({
  response: z.string(),
  intent: z.enum(["WILL_PAY", "HESITANT", "DISPUTE", "NO_RESPONSE", "LANGUAGE_SWITCH", "UNKNOWN"]),
  entities: z.object({
    amount: z.number().nullable().optional(),
    date: z.string().nullable().optional(),
    language: z.enum(["en", "hi"]).nullable().optional()
  }),
  tool: z.enum(["log_promise_to_pay", "schedule_followup", "flag_dispute"]).nullable().optional()
});

export class GroqLlmClient {
  private readonly client: Groq;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Groq({ apiKey });
    this.model = model ?? "llama-3.3-70b-versatile";
  }

  async generateStructuredResponse(input: {
    transcript: string;
    state: CollectionsStateId;
    session: SessionState;
  }): Promise<LlmOutput> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a collections call assistant. Return valid JSON only with keys response, intent, entities, and tool. The state machine owns control flow. Keep response concise and suitable for TTS."
        },
        {
          role: "user",
          content: JSON.stringify({
            conversationState: input.state,
            transcript: input.transcript,
            language: input.session.language,
            transcriptHistory: input.session.transcripts.slice(-6)
          })
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return schema.parse(JSON.parse(raw));
  }
}
