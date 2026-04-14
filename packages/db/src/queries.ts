import type { pg } from "pg";

export interface CallRecord {
  id: string;
  borrower_id: string;
  phone_number: string;
  status: "initiated" | "in_progress" | "completed" | "failed";
  start_time: number;
  end_time?: number;
  final_state?: string;
  duration_seconds?: number;
  created_at: Date;
  updated_at: Date;
}

export interface TranscriptRecord {
  id: string;
  call_id: string;
  speaker: "user" | "agent";
  text: string;
  timestamp: number;
  created_at: Date;
}

export interface ActionRecord {
  id: string;
  call_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  success: boolean;
  created_at: Date;
}

export interface BorrowerRecord {
  id: string;
  phone_number: string;
  name?: string;
  outstanding_amount?: number;
  due_date?: string;
  risk_level?: "low" | "medium" | "high";
  created_at: Date;
  updated_at: Date;
}

export interface QueryBuilder {
  insertCall(callId: string, borrowerId: string, phoneNumber: string): Promise<CallRecord>;
  updateCallStatus(callId: string, status: CallRecord["status"], endTime?: number): Promise<void>;
  updateCallFinalState(callId: string, state: string, duration: number): Promise<void>;
  
  insertTranscript(callId: string, speaker: "user" | "agent", text: string, timestamp: number): Promise<TranscriptRecord>;
  getTranscripts(callId: string): Promise<TranscriptRecord[]>;
  
  insertAction(callId: string, toolName: string, toolInput: Record<string, unknown>, toolOutput: Record<string, unknown>, success: boolean): Promise<ActionRecord>;
  getActions(callId: string): Promise<ActionRecord[]>;
  
  upsertBorrower(borrower: Omit<BorrowerRecord, "id" | "created_at" | "updated_at">): Promise<BorrowerRecord>;
  getBorrower(borrowerId: string): Promise<BorrowerRecord | null>;
  getBorrowerByPhone(phoneNumber: string): Promise<BorrowerRecord | null>;
}

export class PostgresQueryBuilder implements QueryBuilder {
  constructor(private readonly pool: pg.Pool) {}

  async insertCall(callId: string, borrowerId: string, phoneNumber: string): Promise<CallRecord> {
    const result = await this.pool.query<CallRecord>(
      `INSERT INTO calls (id, borrower_id, phone_number, status, start_time, created_at, updated_at)
       VALUES ($1, $2, $3, 'initiated', $4, $5, $6)
       RETURNING *`,
      [callId, borrowerId, phoneNumber, Date.now(), new Date(), new Date()]
    );
    return result.rows[0];
  }

  async updateCallStatus(callId: string, status: CallRecord["status"], endTime?: number): Promise<void> {
    const result = await this.pool.query(
      `UPDATE calls SET status = $1, end_time = COALESCE($2, end_time), updated_at = $3 WHERE id = $4`,
      [status, endTime ?? null, new Date(), callId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Call not found: ${callId}`);
    }
  }

  async updateCallFinalState(callId: string, state: string, duration: number): Promise<void> {
    const result = await this.pool.query(
      `UPDATE calls SET final_state = $1, duration_seconds = $2, updated_at = $3 WHERE id = $4`,
      [state, duration, new Date(), callId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Call not found: ${callId}`);
    }
  }

  async insertTranscript(callId: string, speaker: "user" | "agent", text: string, timestamp: number): Promise<TranscriptRecord> {
    const result = await this.pool.query<TranscriptRecord>(
      `INSERT INTO transcripts (id, call_id, speaker, text, timestamp, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
      [callId, speaker, text, timestamp, new Date()]
    );
    return result.rows[0];
  }

  async getTranscripts(callId: string): Promise<TranscriptRecord[]> {
    const result = await this.pool.query<TranscriptRecord>(
      `SELECT * FROM transcripts WHERE call_id = $1 ORDER BY timestamp ASC`,
      [callId]
    );
    return result.rows;
  }

  async insertAction(
    callId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolOutput: Record<string, unknown>,
    success: boolean
  ): Promise<ActionRecord> {
    const result = await this.pool.query<ActionRecord>(
      `INSERT INTO actions (id, call_id, tool_name, tool_input, tool_output, success, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [callId, toolName, JSON.stringify(toolInput), JSON.stringify(toolOutput), success, new Date()]
    );
    return result.rows[0];
  }

  async getActions(callId: string): Promise<ActionRecord[]> {
    const result = await this.pool.query<ActionRecord>(
      `SELECT * FROM actions WHERE call_id = $1 ORDER BY created_at ASC`,
      [callId]
    );
    return result.rows;
  }

  async upsertBorrower(borrower: Omit<BorrowerRecord, "id" | "created_at" | "updated_at">): Promise<BorrowerRecord> {
    const result = await this.pool.query<BorrowerRecord>(
      `INSERT INTO borrowers (id, phone_number, name, outstanding_amount, due_date, risk_level, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (phone_number) DO UPDATE SET
         name = EXCLUDED.name,
         outstanding_amount = EXCLUDED.outstanding_amount,
         due_date = EXCLUDED.due_date,
         risk_level = EXCLUDED.risk_level,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        borrower.phone_number,
        borrower.name ?? null,
        borrower.outstanding_amount ?? null,
        borrower.due_date ?? null,
        borrower.risk_level ?? null,
        new Date(),
        new Date()
      ]
    );
    return result.rows[0];
  }

  async getBorrower(borrowerId: string): Promise<BorrowerRecord | null> {
    const result = await this.pool.query<BorrowerRecord>(
      `SELECT * FROM borrowers WHERE id = $1`,
      [borrowerId]
    );
    return result.rows[0] ?? null;
  }

  async getBorrowerByPhone(phoneNumber: string): Promise<BorrowerRecord | null> {
    const result = await this.pool.query<BorrowerRecord>(
      `SELECT * FROM borrowers WHERE phone_number = $1`,
      [phoneNumber]
    );
    return result.rows[0] ?? null;
  }
}

export const createQueryBuilder = (pool: pg.Pool): QueryBuilder => {
  return new PostgresQueryBuilder(pool);
};