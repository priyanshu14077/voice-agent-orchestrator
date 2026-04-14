import "dotenv/config";

interface EnvConfig {
  port: number;
  deepgram: {
    apiKey?: string;
    url?: string;
    model?: string;
  };
  vad: {
    url: string;
    timeoutMs: number;
  };
  orchestrator: {
    url: string;
  };
  vadSilenceMs: number;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const loadConfig = (): EnvConfig => {
  return {
    port: parseNumber(process.env.PORT, 8080),
    deepgram: {
      apiKey: process.env.DEEPGRAM_API_KEY,
      url: process.env.DEEPGRAM_URL,
      model: process.env.DEEPGRAM_MODEL
    },
    vad: {
      url: process.env.VAD_URL ?? "http://127.0.0.1:8000",
      timeoutMs: parseNumber(process.env.VAD_TIMEOUT_MS, 1500)
    },
    orchestrator: {
      url: process.env.ORCHESTRATOR_WS_URL ?? "ws://127.0.0.1:8090"
    },
    vadSilenceMs: parseNumber(process.env.VAD_SILENCE_MS, 500)
  };
};

export const config = loadConfig();