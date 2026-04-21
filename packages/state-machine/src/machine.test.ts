import { describe, it, expect } from "vitest";
import { 
  resolveCollectionsState, 
  collectionsInitialState, 
  isTerminalState,
  type CollectionsIntentEvent,
  type CollectionsStateId
} from "./machine.js";

describe("Collections State Machine", () => {
  describe("resolveCollectionsState", () => {
    it("should start in greeting state", () => {
      expect(collectionsInitialState).toBe("greeting");
    });

    it("should transition from greeting to promise_to_pay on WILL_PAY", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "WILL_PAY",
        transcript: "I will pay tomorrow"
      };
      const nextState = resolveCollectionsState("greeting", event);
      expect(nextState).toBe("promise_to_pay");
    });

    it("should transition from greeting to situation_assessment on HESITANT", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "HESITANT",
        transcript: "I need more time"
      };
      const nextState = resolveCollectionsState("greeting", event);
      expect(nextState).toBe("situation_assessment");
    });

    it("should transition from greeting to escalation on DISPUTE", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "DISPUTE",
        transcript: "I don't owe this"
      };
      const nextState = resolveCollectionsState("greeting", event);
      expect(nextState).toBe("escalation");
    });

    it("should transition from greeting to voicemail on NO_RESPONSE", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "NO_RESPONSE",
        transcript: ""
      };
      const nextState = resolveCollectionsState("greeting", event);
      expect(nextState).toBe("voicemail");
    });

    it("should transition from situation_assessment to negotiation on HESITANT", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "HESITANT",
        transcript: "I can't pay right now"
      };
      const nextState = resolveCollectionsState("situation_assessment", event);
      expect(nextState).toBe("negotiation");
    });

    it("should stay in same state for unknown intents", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "UNKNOWN",
        transcript: "random text"
      };
      const nextState = resolveCollectionsState("greeting", event);
      expect(nextState).toBe("situation_assessment");
    });

    it("should return same state for no matching transition", () => {
      const event: CollectionsIntentEvent = {
        type: "INTENT_REPORTED",
        intent: "UNKNOWN",
        transcript: "test"
      };
      const currentState: CollectionsStateId = "promise_to_pay";
      const nextState = resolveCollectionsState(currentState, event);
      expect(nextState).toBe("promise_to_pay");
    });
  });

  describe("isTerminalState", () => {
    it("should identify promise_to_pay as terminal", () => {
      expect(isTerminalState("promise_to_pay")).toBe(true);
    });

    it("should identify escalation as terminal", () => {
      expect(isTerminalState("escalation")).toBe(true);
    });

    it("should identify voicemail as terminal", () => {
      expect(isTerminalState("voicemail")).toBe(true);
    });

    it("should not identify greeting as terminal", () => {
      expect(isTerminalState("greeting")).toBe(false);
    });

    it("should not identify negotiation as terminal", () => {
      expect(isTerminalState("negotiation")).toBe(false);
    });
  });
});