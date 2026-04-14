export interface PromptOptions {
  language?: "en" | "hi";
  state?: string;
}

export const COLLECTIONS_SYSTEM_PROMPT = `You are a loan collections agent for a financial services company.

Your role is to:
1. Politely but firmly remind borrowers about outstanding payments
2. Assess their situation and willingness to pay
3. Secure commitments or schedule follow-ups
4. NEVER invent loan details - only use information provided
5. NEVER reveal sensitive account details during the call

Communication guidelines:
- Keep responses short (1-2 sentences) and natural for speech
- Use a professional, empathetic tone
- Focus on the path forward, not past failures
- If user agrees to pay, confirm amount and date
- If user resists, acknowledge and offer alternatives
- If user asks for details you don't have, redirect to customer service

State machine controls flow - you provide intent classification and response, not control decisions.`;

export const INTENT_CLASSIFICATION_PROMPT = `Classify the user's intent from the transcript. 

Available intents:
- WILL_PAY: User expresses clear intent to pay (e.g., "I'll pay tomorrow", "Can I pay next week")
- HESITANT: User shows uncertainty or asks questions (e.g., "I don't know", "can you explain")
- DISPUTE: User questions the debt or amount (e.g., "that's not my debt", "wrong amount")
- NO_RESPONSE: No clear response or silence
- LANGUAGE_SWITCH: User switches language
- UNKNOWN: Cannot determine intent

Extract entities:
- amount: Payment amount mentioned (number)
- date: Payment date mentioned (YYYY-MM-DD)
- language: Detected language (en/hi)`;

export const GREETING_PROMPTS: Record<string, string> = {
  en: "Hello, this is calling from the collections department. May I speak with {name}?",
  hi: "Namaste, main collections department se bol raha hoon. Kya main {name} se baat kar sakta hoon?"
};

export const PAYMENT_REMINDER_PROMPTS: Record<string, string> = {
  en: "I wanted to remind you about your outstanding payment of {amount} that was due on {dueDate}.",
  hi: "Main aapko {amount} ki baaki raashi ke baare mein yaad dilana chahta hoon jo {dueDate} ko due thi."
};

export const PROMISE_CONFIRMATION_PROMPTS: Record<string, string> = {
  en: "Thank you. Just to confirm, you'll pay {amount} on {date}. Is that correct?",
  hi: "Dhanyavaad. Bas confirm karne ke liye, aap {amount} {date} ko pay karenge. Kya yeh sahi hai?"
};

export const ESCALATION_PROMPTS: Record<string, string> = {
  en: "I understand. Let me connect you with a supervisor who can help resolve this.",
  hi: "Samajh gaya. Mujhe aapko ek supervisor se connect karne do jo isme madad kar sake."
};

export const createGreetingPrompt = (name: string, language: "en" | "hi" = "en"): string => {
  return GREETING_PROMPTS[language].replace("{name}", name);
};

export const createPaymentReminderPrompt = (
  amount: string,
  dueDate: string,
  language: "en" | "hi" = "en"
): string => {
  return PAYMENT_REMINDER_PROMPTS[language]
    .replace("{amount}", amount)
    .replace("{dueDate}", dueDate);
};

export const createPromiseConfirmationPrompt = (
  amount: string,
  date: string,
  language: "en" | "hi" = "en"
): string => {
  return PROMISE_CONFIRMATION_PROMPTS[language]
    .replace("{amount}", amount)
    .replace("{date}", date);
};

export const createEscalationPrompt = (language: "en" | "hi" = "en"): string => {
  return ESCALATION_PROMPTS[language];
};