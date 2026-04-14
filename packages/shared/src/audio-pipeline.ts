import type { Readable } from "node:stream";
import { EventEmitter } from "node:events";

export interface AudioFrame {
  data: Buffer;
  timestamp: number;
  sequence: number;
}

export interface PipelineOptions {
  frameSize?: number;
  sampleRate?: number;
  channels?: number;
}

export class AudioPipeline extends EventEmitter {
  private readonly frameSize: number;
  private readonly sampleRate: number;
  private readonly channels: number;
  private sequence = 0;
  private stream: Readable | null = null;

  constructor(options: PipelineOptions = {}) {
    super();
    this.frameSize = options.frameSize ?? 1024;
    this.sampleRate = options.sampleRate ?? 8000;
    this.channels = options.channels ?? 1;
  }

  async pipe(source: Readable): Promise<void> {
    this.stream = source;

    for await (const chunk of source) {
      const frame: AudioFrame = {
        data: Buffer.from(chunk as Buffer),
        timestamp: Date.now(),
        sequence: this.sequence++
      };

      this.emit("frame", frame);
    }

    this.emit("end");
  }

  stop(): void {
    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }
  }

  reset(): void {
    this.sequence = 0;
    this.stop();
  }
}

export const createAudioPipeline = (options?: PipelineOptions): AudioPipeline => {
  return new AudioPipeline(options);
};