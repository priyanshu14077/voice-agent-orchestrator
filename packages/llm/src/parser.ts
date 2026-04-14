import { z } from "zod";

const intentSchema = z.enum([
  "WILL_PAY",
  "HESITANT",
  "DISPUTE",
  "NO_RESPONSE",
  "LANGUAGE_SWITCH",
  "UNKNOWN"
]);

const entitiesSchema = z.object({
  amount: z.number().nullable().optional(),
  date: z.string().nullable().optional(),
  language: z.enum(["en", "hi"]).nullable().optional()
});

export const llmOutputSchema = z.object({
  response: z.string(),
  intent: intentSchema,
  entities: entitiesSchema,
  tool: z
    .enum(["log_promise_to_pay", "schedule_followup", "flag_dispute"])
    .nullable()
    .optional()
});

export type LlmOutput = z.infer<typeof llmOutputSchema>;
export type Intent = z.infer<typeof intentSchema>;

export interface ParseResult {
  ok: boolean;
  data?: LlmOutput;
  error?: string;
  raw?: string;
}

export const parseLlmOutput = (raw: string, maxRetries = 3): ParseResult => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const parsed = JSON.parse(raw);
      const result = llmOutputSchema.safeParse(parsed);

      if (result.success) {
        return { ok: true, data: result.data };
      }

      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      console.warn("[llm:parse] validation failed:", issues);

      const attemptMsg = `Please respond with valid JSON matching: response (string), intent (WILL_PAY|HESITANT|DISPUTE|NO_RESPONSE|LANGUAGE_SWITCH|UNKNOWN), entities (amount/number, date/string, language/en|hi), tool (optional).`;
      return { ok: false, error: issues, raw: attemptMsg };
    } catch (e) {
      console.warn("[llm:parse] JSON parse failed:", e);
    }
  }

  return {
    ok: false,
    error: "Failed to parse LLM output after all retries",
    raw
  };
};

export const validateLlmOutput = (data: unknown): LlmOutput | null => {
  const result = llmOutputSchema.safeParse(data);
  return result.success ? result.data : null;
};