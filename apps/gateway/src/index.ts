import "dotenv/config";

import { GatewayServer } from "./ws-server.js";

const port = Number(process.env.PORT ?? 8080);
const deepgramSampleRate = Number(process.env.DEEPGRAM_SAMPLE_RATE ?? 8000);
const deepgramChannels = Number(process.env.DEEPGRAM_CHANNELS ?? 1);
const deepgramEndpointingMs = Number(process.env.DEEPGRAM_ENDPOINTING_MS ?? 500);
const deepgramUtteranceEndMs = Number(process.env.DEEPGRAM_UTTERANCE_END_MS ?? 500);
const vadTimeoutMs = Number(process.env.VAD_TIMEOUT_MS ?? 1500);
const vadSilenceMs = Number(process.env.VAD_SILENCE_MS ?? 500);

const gateway = new GatewayServer({
  port,
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY,
    url: process.env.DEEPGRAM_URL,
    model: process.env.DEEPGRAM_MODEL,
    encoding: process.env.DEEPGRAM_ENCODING,
    sampleRate: Number.isFinite(deepgramSampleRate) ? deepgramSampleRate : undefined,
    channels: Number.isFinite(deepgramChannels) ? deepgramChannels : undefined,
    endpointingMs: Number.isFinite(deepgramEndpointingMs) ? deepgramEndpointingMs : undefined,
    utteranceEndMs: Number.isFinite(deepgramUtteranceEndMs) ? deepgramUtteranceEndMs : undefined
  },
  vad: {
    baseUrl: process.env.VAD_URL ?? "http://127.0.0.1:8000",
    timeoutMs: Number.isFinite(vadTimeoutMs) ? vadTimeoutMs : undefined
  },
  orchestrator: {
    url: process.env.ORCHESTRATOR_WS_URL ?? `ws://127.0.0.1:${process.env.ORCHESTRATOR_PORT ?? "8090"}`
  }
  ,
  vadSilenceMs: Number.isFinite(vadSilenceMs) ? vadSilenceMs : undefined
});

gateway.start();
