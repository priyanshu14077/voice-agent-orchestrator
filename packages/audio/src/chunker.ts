import type { Readable } from "node:stream";

export interface AudioChunk {
  data: Buffer;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface StreamOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  chunkSize?: number;
}

export class AudioChunker {
  private readonly defaultChunkSize: number;

  constructor(defaultChunkSize = 1024) {
    this.defaultChunkSize = defaultChunkSize;
  }

  chunkBuffer(buffer: Buffer, chunkSize?: number): Buffer[] {
    const size = chunkSize ?? this.defaultChunkSize;
    const chunks: Buffer[] = [];

    for (let i = 0; i < buffer.length; i += size) {
      chunks.push(buffer.subarray(i, i + size));
    }

    return chunks;
  }

  *chunkStream(readable: Readable, chunkSize?: number): Generator<AudioChunk> {
    const size = chunkSize ?? this.defaultChunkSize;
    let buffer = Buffer.alloc(0);
    let index = 0;

    for await (const chunk of readable) {
      buffer = Buffer.concat([buffer, Buffer.from(chunk as Buffer)]);
    }

    const total = Math.ceil(buffer.length / size);

    for (let i = 0; i < buffer.length; i += size) {
      yield {
        data: buffer.subarray(i, i + size),
        index,
        total,
        isFirst: index === 0,
        isLast: index === total - 1
      };
      index++;
    }
  }

  async chunkAudio(
    audio: Buffer,
    chunkSize?: number
  ): Promise<AudioChunk[]> {
    const chunks = this.chunkBuffer(audio, chunkSize);
    return chunks.map((data, index) => ({
      data,
      index,
      total: chunks.length,
      isFirst: index === 0,
      isLast: index === chunks.length - 1
    }));
  }
}

export const createChunker = (defaultChunkSize?: number): AudioChunker => {
  return new AudioChunker(defaultChunkSize);
};