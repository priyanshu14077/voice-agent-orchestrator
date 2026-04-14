import { randomUUID } from "node:crypto";

import type { SessionState } from "@voice-agent/shared";

export class SessionManager {
  private readonly sessions = new Map<string, SessionState>();

  create(callId?: string): SessionState {
    const id = callId ?? randomUUID();
    const session: SessionState = {
      callId: id,
      state: "greeting",
      transcripts: [],
      partialTranscript: "",
      language: "en",
      lastSpeechAt: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(id, session);
    return session;
  }

  get(callId: string): SessionState | undefined {
    return this.sessions.get(callId);
  }

  upsert(session: SessionState): void {
    session.updatedAt = Date.now();
    this.sessions.set(session.callId, session);
  }

  remove(callId: string): void {
    this.sessions.delete(callId);
  }
}
