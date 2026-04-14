import { TtsClient, type TtsClientOptions } from "./tts-client.js";
import { AudioChunker, createChunker } from "./chunker.js";

export { TtsClient, createTtsClient } from "./tts-client.js";
export type { TtsClientOptions, TtsResponse, TtsStreamOptions, StreamCallbacks } from "./tts-client.js";
export { AudioChunker, createChunker } from "./chunker.js";
export type { AudioChunk, StreamOptions } from "./chunker.js";