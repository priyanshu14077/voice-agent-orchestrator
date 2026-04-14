import type { RedisClientType } from "redis";
import type { SessionState, CollectionsStateId } from "@voice-agent/shared";

export interface SessionStoreOptions {
  defaultTtlSeconds?: number;
  keyPrefix?: string;
}

export class SessionStore {
  private readonly client: RedisClientType;
  private readonly defaultTtl: number;
  private readonly prefix: string;

  constructor(client: RedisClientType, options: SessionStoreOptions = {}) {
    this.client = client;
    this.defaultTtl = options.defaultTtlSeconds ?? 3600;
    this.prefix = options.keyPrefix ?? "session:";
  }

  private key(callId: string): string {
    return `${this.prefix}${callId}`;
  }

  async create(callId: string): Promise<SessionState> {
    const session: SessionState = {
      callId,
      state: "greeting",
      transcripts: [],
      partialTranscript: "",
      language: "en",
      lastSpeechAt: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.set(callId, session, this.defaultTtl);
    return session;
  }

  async get(callId: string): Promise<SessionState | null> {
    const data = await this.client.get(this.key(callId));
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as SessionState;
    } catch {
      return null;
    }
  }

  async set(callId: string, session: SessionState, ttlSeconds?: number): Promise<void> {
    session.updatedAt = Date.now();
    const key = this.key(callId);
    const ttl = ttlSeconds ?? this.defaultTtl;

    await this.client.setEx(key, ttl, JSON.stringify(session));
  }

  async update(callId: string, updates: Partial<SessionState>): Promise<SessionState | null> {
    const session = await this.get(callId);
    if (!session) {
      return null;
    }

    const updated = { ...session, ...updates, updatedAt: Date.now() };
    await this.set(callId, updated);
    return updated;
  }

  async delete(callId: string): Promise<void> {
    await this.client.del(this.key(callId));
  }

  async exists(callId: string): Promise<boolean> {
    const exists = await this.client.exists(this.key(callId));
    return exists === 1;
  }

  async extendTtl(callId: string, ttlSeconds?: number): Promise<boolean> {
    const key = this.key(callId);
    const ttl = ttlSeconds ?? this.defaultTtl;
    const result = await this.client.expire(key, ttl);
    return result === 1;
  }

  async listKeys(pattern: string = "*"): Promise<string[]> {
    const fullPattern = `${this.prefix}${pattern}`;
    return this.client.keys(fullPattern);
  }

  async getAllSessions(): Promise<SessionState[]> {
    const keys = await this.listKeys();
    const sessions: SessionState[] = [];

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        try {
          sessions.push(JSON.parse(data) as SessionState);
        } catch {
          // skip invalid entries
        }
      }
    }

    return sessions;
  }

  async recoverOrphans(): Promise<number> {
    const keys = await this.listKeys();
    let recovered = 0;

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        try {
          const session = JSON.parse(data) as SessionState;
          if (session.callId !== key.replace(this.prefix, "")) {
            continue;
          }
          await this.extendTtl(session.callId);
          recovered++;
        } catch {
          // invalid entry, will be cleaned up
        }
      }
    }

    return recovered;
  }
}

export const createSessionStore = (
  client: RedisClientType,
  options?: SessionStoreOptions
): SessionStore => {
  return new SessionStore(client, options);
};