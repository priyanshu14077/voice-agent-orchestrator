import { Buffer } from "node:buffer";

export interface ElevenLabsOptions {
  apiKey?: string;
  baseUrl?: string;
  voiceId?: string;
  modelId?: string;
  latencyOptimization?: number;
  outputFormat?: string;
}

export interface TtsResponse {
  audio: Uint8Array;
  duration: number;
}

export interface TtsStreamOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export interface TtsClient {
  speak(callId: string, text: string): Promise<TtsResponse>;
  stream(options: TtsStreamOptions): AsyncIterable<Uint8Array>;
  interrupt(callId: string): Promise<void>;
}

export class ElevenLabsClient implements TtsClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultVoiceId: string;
  private readonly defaultModel: string;
  private readonly activeStreams = new Map<string, AbortController>();

  constructor(options: ElevenLabsOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.elevenlabs.io/v1";
    this.defaultVoiceId = options.voiceId ?? "21m00Tcm4TlvDq8ikWAM";
    this.defaultModel = options.modelId ?? "eleven_multilingual_v2";
  }

  async speak(callId: string, text: string): Promise<TtsResponse> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const voiceId = this.defaultVoiceId;
    const url = `${this.baseUrl}/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey
      },
      body: JSON.stringify({
        text,
        model_id: this.defaultModel,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${response.status} - ${error}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());
    const duration = this.estimateDuration(audio);

    return { audio, duration };
  }

  async *stream(options: TtsStreamOptions): AsyncIterable<Uint8Array> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const voiceId = options.voiceId ?? this.defaultVoiceId;
    const url = `${this.baseUrl}/text-to-speech/${voiceId}/stream`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId ?? this.defaultModel
      })
    });

    if (!response.ok || !response.body) {
      const error = await response.text();
      throw new Error(`ElevenLabs streaming TTS failed: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }

  async interrupt(callId: string): Promise<void> {
    const controller = this.activeStreams.get(callId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(callId);
    }
  }

  private estimateDuration(audio: Uint8Array): number {
    const bytesPerSample = 2;
    const sampleRate = 22050;
    const estimatedSeconds = audio.length / (bytesPerSample * sampleRate);
    return estimatedSeconds;
  }

  setVoice(voiceId: string): void {
    // For future use - voice selection
  }
}

export const createElevenLabsClient = (options?: ElevenLabsOptions): ElevenLabsClient => {
  return new ElevenLabsClient(options);
};