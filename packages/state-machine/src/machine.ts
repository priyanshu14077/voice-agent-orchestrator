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

export interface CollectionsIntentEvent {
  type: "INTENT_REPORTED";
  intent: Intent;
  transcript: string;
  entities?: {
    amount?: number | null;
    date?: string | null;
    language?: "en" | "hi" | null;
  };
}

type CollectionsTransitionTable = Record<CollectionsStateId, Partial<Record<Intent, CollectionsStateId>>>;

export const collectionsInitialState: CollectionsStateId = "greeting";

export const collectionsTransitionTable: CollectionsTransitionTable = {
  greeting: {
    WILL_PAY: "promise_to_pay",
    HESITANT: "situation_assessment",
    DISPUTE: "escalation",
    NO_RESPONSE: "voicemail",
    LANGUAGE_SWITCH: "language_switch",
    UNKNOWN: "situation_assessment"
  },
  situation_assessment: {
    WILL_PAY: "repayment_offer",
    HESITANT: "negotiation",
    DISPUTE: "escalation",
    NO_RESPONSE: "voicemail",
    LANGUAGE_SWITCH: "language_switch",
    UNKNOWN: "situation_assessment"
  },
  repayment_offer: {
    WILL_PAY: "promise_to_pay",
    HESITANT: "negotiation",
    DISPUTE: "escalation",
    NO_RESPONSE: "voicemail",
    LANGUAGE_SWITCH: "language_switch",
    UNKNOWN: "repayment_offer"
  },
  negotiation: {
    WILL_PAY: "promise_to_pay",
    HESITANT: "negotiation",
    DISPUTE: "escalation",
    NO_RESPONSE: "voicemail",
    LANGUAGE_SWITCH: "language_switch",
    UNKNOWN: "negotiation"
  },
  promise_to_pay: {},
  escalation: {},
  voicemail: {},
  language_switch: {
    WILL_PAY: "promise_to_pay",
    HESITANT: "negotiation",
    DISPUTE: "escalation",
    NO_RESPONSE: "voicemail",
    LANGUAGE_SWITCH: "language_switch",
    UNKNOWN: "situation_assessment"
  }
};

export const resolveCollectionsState = (
  currentState: CollectionsStateId,
  event: CollectionsIntentEvent
): CollectionsStateId => {
  const byIntent = collectionsTransitionTable[currentState];
  return byIntent[event.intent] ?? currentState;
};

export const isTerminalState = (state: CollectionsStateId): boolean =>
  state === "promise_to_pay" || state === "escalation" || state === "voicemail";