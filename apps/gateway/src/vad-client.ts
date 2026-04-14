export interface VadDetectionResult {
  speech: boolean;
  speechEnd: boolean;
  energy: number;
  frameMs: number;
  source: "remote" | "local";
}

export interface VadHttpClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  speechThreshold?: number;
}

export class VadHttpClient {
  private readonly baseUrl?: string;
  private readonly timeoutMs: number;
  private readonly speechThreshold: number;

  constructor(options: VadHttpClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 1500;
    this.speechThreshold = options.speechThreshold ?? 0.015;
  }

  async detect(audio: Buffer, frameMs = 20): Promise<VadDetectionResult> {
    const energy = estimateEnergy(audio);

    if (!this.baseUrl) {
      return this.localDetect(energy, frameMs);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(new URL("/vad", this.baseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          energy,
          frame_ms: frameMs
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`VAD request failed with ${response.status}`);
      }

      const payload = (await response.json()) as {
        speech?: boolean;
        speech_end?: boolean;
        silence_ms?: number;
      };

      return {
        speech: Boolean(payload.speech),
        speechEnd: Boolean(payload.speech_end),
        energy,
        frameMs,
        source: "remote"
      };
    } catch {
      return this.localDetect(energy, frameMs);
    }
  }

  private localDetect(energy: number, frameMs: number): VadDetectionResult {
    const speech = energy >= this.speechThreshold;

    return {
      speech,
      speechEnd: !speech,
      energy,
      frameMs,
      source: "local"
    };
  }
}

export function estimateEnergy(audio: Buffer): number {
  if (audio.length === 0) {
    return 0;
  }

  let total = 0;
  for (const byte of audio) {
    total += Math.abs(byte - 128);
  }

  return Math.min(1, total / (audio.length * 128));
}
