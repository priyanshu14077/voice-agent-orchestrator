import {
  resolveCollectionsState,
  updateSessionLanguage,
  type CollectionsIntentEvent
} from "@voice-agent/state-machine";
import type { LlmOutput, SessionState, TranscriptFinalEvent, VoiceEvent } from "@voice-agent/shared";

import { GroqLlmClient } from "./llm/groq-client.js";
import { ToolRunner } from "./tool-runner.js";

export interface OrchestratorDependencies {
  llm: GroqLlmClient;
  toolRunner: ToolRunner;
  tts: {
    speak(callId: string, text: string): Promise<void>;
    interrupt(callId: string): Promise<void>;
  };
}

export class Orchestrator {
  constructor(private readonly deps: OrchestratorDependencies) {}

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

    await this.applyLlmOutput(llmOutput, session, event);
    return session;
  }

  private async applyLlmOutput(
    output: LlmOutput,
    session: SessionState,
    event: TranscriptFinalEvent
  ): Promise<void> {
    const intentEvent: CollectionsIntentEvent = {
      type: "INTENT_REPORTED",
      intent: output.intent,
      transcript: event.text,
      entities: output.entities
    };

    session.state = resolveCollectionsState(session.state, intentEvent);
    updateSessionLanguage(session, intentEvent);

    session.transcripts.push(`agent: ${output.response}`);

    await this.deps.toolRunner.run(output, session);
    await this.deps.tts.speak(session.callId, output.response);
  }
}
