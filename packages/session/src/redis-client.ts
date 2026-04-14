import { createClient, type RedisClientType } from "redis";

export interface RedisClientOptions {
  url?: string;
  host?: string;
  port?: number;
  database?: number;
}

export class RedisClient {
  private client: RedisClientType | null = null;
  private readonly options: RedisClientOptions;

  constructor(options: RedisClientOptions = {}) {
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    const url =
      this.options.url ??
      `redis://${this.options.host ?? "localhost"}:${this.options.port ?? 6379}`;

    this.client = createClient({ url, database: this.options.database });

    this.client.on("error", (err) => {
      console.error("[redis:error]", err);
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error("Redis client not connected. Call connect() first.");
    }
    return this.client;
  }

  isConnected(): boolean {
    return this.client?.isOpen ?? false;
  }
}

export const createRedisClient = (options?: RedisClientOptions): RedisClient => {
  return new RedisClient(options);
};