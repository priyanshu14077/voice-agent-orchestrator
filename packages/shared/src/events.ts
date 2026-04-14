import type { LlmOutput } from "./types.js";

export interface AudioChunkEvent {
  type: "AUDIO_CHUNK";
  data: Buffer;
  timestamp: number;
}

export interface SpeechStartEvent {
  type: "SPEECH_START";
  timestamp: number;
}

export interface SpeechEndEvent {
  type: "SPEECH_END";
  timestamp: number;
}

export interface TranscriptPartialEvent {
  type: "TRANSCRIPT_PARTIAL";
  text: string;
  timestamp: number;
}

export interface TranscriptFinalEvent {
  type: "TRANSCRIPT_FINAL";
  text: string;
  timestamp: number;
}

export interface LlmResponseEvent {
  type: "LLM_RESPONSE";
  payload: LlmOutput;
  timestamp: number;
}

export interface TtsChunkEvent {
  type: "TTS_CHUNK";
  audio: Buffer;
  timestamp: number;
}

export type VoiceEvent =
  | AudioChunkEvent
  | SpeechStartEvent
  | SpeechEndEvent
  | TranscriptPartialEvent
  | TranscriptFinalEvent
  | LlmResponseEvent
  | TtsChunkEvent;

export type GatewayMessage =
  | { type: "AUDIO_CHUNK"; audio: string }
  | { type: "CONTROL"; name: "speech_start" | "speech_end" };
