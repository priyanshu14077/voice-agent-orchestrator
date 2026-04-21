import { setup, assign, createMachine, type ActorRefFrom } from "xstate";
import { resolveCollectionsState, collectionsInitialState, isTerminalState, type CollectionsIntentEvent, type CollectionsStateId } from "./machine.js";

export { resolveCollectionsState, collectionsInitialState, isTerminalState };
export type { CollectionsIntentEvent, CollectionsStateId };

export type CollectionsContext = {
  callId: string;
  phoneNumber: string;
  borrowerId?: string;
  transcripts: Array<{ speaker: "user" | "agent"; text: string; timestamp: number }>;
  partialTranscript: string;
  language: "en" | "hi";
  lastSpeechAt: number;
  createdAt: number;
  intentHistory: string[];
  paymentPromise?: {
    amount?: number;
    date?: string;
  };
  errorCount: number;
};

export type CollectionsEvent =
  | { type: "START"; callId: string; phoneNumber: string; borrowerId?: string }
  | { type: "TRANSCRIPT_FINAL"; text: string; timestamp: number }
  | { type: "TRANSCRIPT_PARTIAL"; text: string }
  | { type: "SPEECH_START" }
  | { type: "SPEECH_END"; timestamp: number }
  | { type: "INTENT_REPORTED"; intent: string; entities?: CollectionsIntentEvent["entities"] }
  | { type: "LANGUAGE_CHANGE"; language: "en" | "hi" }
  | { type: "ERROR" }
  | { type: "RESET" };

export const createCollectionsMachine = () => {
  return setup({
    types: {
      context: {} as CollectionsContext,
      events: {} as CollectionsEvent,
      input: {} as { callId: string; phoneNumber: string; borrowerId?: string }
    },
    actions: {
      appendUserTranscript: assign({
        transcripts: ({ context, event }) => {
          if (event.type !== "TRANSCRIPT_FINAL") return context.transcripts;
          return [...context.transcripts, { speaker: "user" as const, text: event.text, timestamp: event.timestamp }];
        },
        partialTranscript: ({ event }) => (event.type === "TRANSCRIPT_FINAL" ? "" : event.type === "TRANSCRIPT_PARTIAL" ? event.text : "")
      }),
      appendAgentTranscript: assign({
        transcripts: ({ context, event }) => {
          if (event.type !== "INTENT_REPORTED") return context.transcripts;
          return [...context.transcripts, { speaker: "agent" as const, text: event.intent, timestamp: Date.now() }];
        }
      }),
      setLanguage: assign({
        language: ({ event }) => (event.type === "LANGUAGE_CHANGE" ? event.language : "en")
      }),
      recordIntent: assign({
        intentHistory: ({ context, event }) => {
          if (event.type !== "INTENT_REPORTED") return context.intentHistory;
          return [...context.intentHistory, event.intent];
        }
      }),
      incrementError: assign({
        errorCount: ({ context }) => context.errorCount + 1
      }),
      resetErrorCount: assign({
        errorCount: 0
      }),
      setPaymentPromise: assign({
        paymentPromise: ({ event }) => {
          if (event.type !== "INTENT_REPORTED" || !event.entities) return undefined;
          return {
            amount: event.entities.amount ?? undefined,
            date: event.entities.date ?? undefined
          };
        }
      }),
      clearPartialTranscript: assign({
        partialTranscript: ""
      })
    },
    guards: {
      isTerminal: ({ context }) => isTerminalState(context.callId as CollectionsStateId),
      hasTooManyErrors: ({ context }) => context.errorCount >= 3,
      isLanguageChange: ({ event }) => event.type === "LANGUAGE_CHANGE"
    }
  }).createMachine({
    id: "collections",
    initial: "idle",
    context: ({ input }) => ({
      callId: input.callId,
      phoneNumber: input.phoneNumber,
      borrowerId: input.borrowerId,
      transcripts: [],
      partialTranscript: "",
      language: "en",
      lastSpeechAt: 0,
      createdAt: Date.now(),
      intentHistory: [],
      errorCount: 0
    }),
    states: {
      idle: {
        on: {
          START: "listening"
        }
      },
      listening: {
        on: {
          TRANSCRIPT_PARTIAL: {
            actions: assign({
              partialTranscript: ({ event }) => event.text
            })
          },
          TRANSCRIPT_FINAL: {
            target: "processing",
            actions: [
              assign({
                transcripts: ({ context, event }) => [
                  ...context.transcripts,
                  { speaker: "user" as const, text: event.text, timestamp: event.timestamp }
                ],
                partialTranscript: ""
              })
            ]
          },
          SPEECH_START: {
            actions: "clearPartialTranscript"
          },
          SPEECH_END: {
            actions: assign({
              lastSpeechAt: ({ event }) => (event.type === "SPEECH_END" ? event.timestamp : 0)
            })
          },
          LANGUAGE_CHANGE: {
            actions: assign({
              language: ({ event }) => (event.type === "LANGUAGE_CHANGE" ? event.language : "en")
            })
          },
          RESET: "idle"
        }
      },
      processing: {
        invoke: {
          src: ({ context, event }) => {
            if (event.type !== "TRANSCRIPT_FINAL") return Promise.resolve(null);
            
            const intentEvent: CollectionsIntentEvent = {
              type: "INTENT_REPORTED",
              intent: "HESITANT",
              transcript: event.text
            };
            
            const nextState = resolveCollectionsState("greeting", intentEvent);
            
            return Promise.resolve({
              nextState,
              intent: intentEvent.intent,
              entities: intentEvent.entities
            });
          },
          onDone: [
            {
              guard: ({ event }) => {
                if (!event.output) return false;
                return isTerminalState(event.output.nextState as CollectionsStateId);
              },
              target: "completed",
              actions: assign({
                callId: ({ context }) => context.callId
              })
            },
            {
              target: "listening",
              actions: [
                assign({
                  intentHistory: ({ context, event }) => {
                    if (!event.output) return context.intentHistory;
                    return [...context.intentHistory, event.output.intent];
                  }
                })
              ]
            }
          ],
          onError: {
            target: "fallback",
            actions: "incrementError"
          }
        },
        on: {
          ERROR: {
            target: "fallback",
            actions: "incrementError"
          }
        }
      },
      fallback: {
        entry: "resetErrorCount",
        on: {
          TRANSCRIPT_FINAL: "listening",
          RESET: "idle"
        }
      },
      completed: {
        type: "final",
        on: {
          RESET: "idle"
        }
      }
    },
    on: {
      RESET: {
        target: "idle",
        actions: assign({
          transcripts: [],
          partialTranscript: "",
          intentHistory: [],
          errorCount: 0
        })
      }
    }
  });
};

export type CollectionsMachine = ReturnType<typeof createCollectionsMachine>;
export type CollectionsActorRef = ActorRefFrom<CollectionsMachine>;
