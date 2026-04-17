import "dotenv/config";

import { Orchestrator } from "./orchestrator.js";
import { createEventRouter, type EventRouterOptions } from "./event-router.js";
import { ElevenLabsClient, type ElevenLabsOptions } from "./tts/eleven-labs-client.js";
import { GroqLlmClient } from "./llm/groq-client.js";
import { ToolRunner } from "./tool-runner.js";

export { Orchestrator } from "./orchestrator.js";
export { EventRouter, createEventRouter } from "./event-router.js";
export type { EventRouterOptions, EventHandler } from "./event-router.js";
export { ElevenLabsClient, createElevenLabsClient } from "./tts/eleven-labs-client.js";
export type { ElevenLabsOptions, TtsClient, TtsResponse } from "./tts/eleven-labs-client.js";
export { GroqLlmClient } from "./llm/groq-client.js";
export { ToolRunner } from "./tool-runner.js";
export type { OrchestratorDependencies } from "./orchestrator.js";

export interface OrchestratorAppOptions {
  llm?: { apiKey?: string; model?: string };
  tts?: ElevenLabsOptions & { apiKey?: string };
  eventRouter?: EventRouterOptions;
}

export const createOrchestratorApp = (options: OrchestratorAppOptions = {}) => {
  const apiKey = options.llm?.apiKey;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("LLM API key is required but not provided");
  }
  const llm = new GroqLlmClient(apiKey, options.llm?.model);
  const toolRunner = new ToolRunner();
  const tts = new ElevenLabsClient(options.tts);

  const orchestrator = new Orchestrator({
    llm,
    toolRunner,
    tts: {
      speak: async (callId: string, text: string) => {
        console.log("[tts:speak]", callId, text);
      },
      interrupt: async (callId: string) => {
        console.log("[tts:interrupt]", callId);
      }
    }
  });

  const eventRouter = createEventRouter(options.eventRouter);

  return { orchestrator, eventRouter, tts, llm, toolRunner };
};