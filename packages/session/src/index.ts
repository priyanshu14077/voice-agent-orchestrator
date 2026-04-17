import { RedisClient } from "./redis-client.js";
import { SessionStore, type SessionStoreOptions } from "./session-store.js";

export { RedisClient, type RedisClientOptions } from "./redis-client.js";
export { SessionStore, type SessionStoreOptions } from "./session-store.js";

export interface SessionState {
  callId: string;
  state: string;
  transcripts: string[];
  partialTranscript: string;
  language: "en" | "hi";
  lastSpeechAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionManagerOptions {
  redis: RedisClient;
  storeOptions?: SessionStoreOptions;
}

export class SessionManager {
  private readonly store: SessionStore;
  private readonly redis: RedisClient;

  constructor(options: SessionManagerOptions) {
    this.redis = options.redis;
    this.store = new SessionStore(this.redis.getClient(), options.storeOptions);
  }

  async create(callId: string): Promise<SessionState> {
    return this.store.create(callId);
  }

  async get(callId: string): Promise<SessionState | null> {
    return this.store.get(callId);
  }

  async set(callId: string, session: SessionState, ttl?: number): Promise<void> {
    return this.store.set(callId, session, ttl);
  }

  async update(callId: string, updates: Partial<SessionState>): Promise<SessionState | null> {
    return this.store.update(callId, updates);
  }

  async delete(callId: string): Promise<void> {
    return this.store.delete(callId);
  }

  async extendTtl(callId: string, ttl?: number): Promise<boolean> {
    return this.store.extendTtl(callId, ttl);
  }
}

export const createSessionManager = (options: SessionManagerOptions): SessionManager => {
  return new SessionManager(options);
};