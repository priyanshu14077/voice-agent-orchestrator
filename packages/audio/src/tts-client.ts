import type { Readable } from "node:stream";

export interface TtsClientOptions {
  apiKey?: string;
  baseUrl?: string;
  voiceId?: string;
  modelId?: string;
}

export interface TtsResponse {
  audio: Buffer;
  duration: number;
}

export interface TtsStreamOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export interface StreamCallbacks {
  onChunk?: (audio: Buffer, index: number, total: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export class TtsClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private defaultVoiceId: string;
  private readonly defaultModel: string;

  constructor(options: TtsClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.elevenlabs.io/v1";
    this.defaultVoiceId = options.voiceId ?? "21m00Tcm4TlvDq8ikWAM";
    this.defaultModel = options.modelId ?? "eleven_multilingual_v2";
  }

  async speak(text: string): Promise<TtsResponse> {
    if (!this.apiKey) {
      throw new Error("TTS API key not configured");
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
        model_id: this.defaultModel
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS failed: ${response.status} - ${error}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());
    const duration = this.estimateDuration(audio);

    return { audio, duration };
  }

  async stream(text: string, callbacks?: StreamCallbacks): Promise<Readable> {
    if (!this.apiKey) {
      throw new Error("TTS API key not configured");
    }

    callbacks?.onStart?.();

    const voiceId = this.defaultVoiceId;
    const url = `${this.baseUrl}/text-to-speech/${voiceId}/stream`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey
      },
      body: JSON.stringify({
        text,
        model_id: this.defaultModel
      })
    });

    if (!response.ok) {
      const error = await response.text();
      callbacks?.onError?.(new Error(`TTS stream failed: ${response.status} - ${error}`));
      throw new Error(`TTS stream failed: ${response.status} - ${error}`);
    }

    return response.body as unknown as Readable;
  }

  private estimateDuration(audio: Buffer): number {
    const bytesPerSample = 2;
    const sampleRate = 22050;
    return audio.length / (bytesPerSample * sampleRate);
  }

  setVoice(voiceId: string): void {
    this.defaultVoiceId = voiceId;
  }
}

export const createTtsClient = (options?: TtsClientOptions): TtsClient => {
  return new TtsClient(options);
};