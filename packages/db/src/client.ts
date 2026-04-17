import { Pool, PoolClient, QueryResult } from "pg";

export interface PostgresClientOptions {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectTimeoutMillis?: number;
}

export class PostgresClient {
  private pool: Pool | null = null;
  private readonly options: PostgresClientOptions;

  constructor(options: PostgresClientOptions = {}) {
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      connectionString: this.options.connectionString,
      host: this.options.host ?? "localhost",
      port: this.options.port ?? 5432,
      database: this.options.database ?? "voice_agent",
      user: this.options.user ?? "postgres",
      password: this.options.password,
      max: this.options.max ?? 20,
      idleTimeoutMillis: this.options.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: this.options.connectTimeoutMillis ?? 5000
    });

    this.pool.on("error", (err) => {
      console.error("[postgres:pool:error]", err);
    });

    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error("Postgres client not connected. Call connect() first.");
    }
    return this.pool;
  }

  async query<T extends Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    const pool = this.getPool();
    return pool.query<T>(text, params);
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }
}

export const createPostgresClient = (options?: PostgresClientOptions): PostgresClient => {
  return new PostgresClient(options);
};