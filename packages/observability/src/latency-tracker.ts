export interface LatencyRecord {
  stage: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export class LatencyTracker {
  private readonly records = new Map<string, LatencyRecord[]>();
  private activeRecords = new Map<string, LatencyRecord>();

  start(stage: string, metadata?: Record<string, unknown>): string {
    const id = `${stage}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: LatencyRecord = {
      stage,
      startTime: Date.now(),
      metadata
    };

    this.activeRecords.set(id, record);
    return id;
  }

  end(id: string): LatencyRecord | null {
    const record = this.activeRecords.get(id);
    if (!record) {
      return null;
    }

    record.endTime = Date.now();
    record.durationMs = record.endTime - record.startTime;

    this.activeRecords.delete(id);

    const stageRecords = this.records.get(record.stage) ?? [];
    stageRecords.push(record);
    this.records.set(record.stage, stageRecords);

    return record;
  }

  getStageStats(stage: string): { count: number; avgMs: number; minMs: number; maxMs: number } | null {
    const records = this.records.get(stage);
    if (!records || records.length === 0) {
      return null;
    }

    const durations = records.map((r) => r.durationMs ?? 0);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: records.length,
      avgMs: Math.round(sum / records.length),
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations)
    };
  }

  getAllStats(): Record<string, { count: number; avgMs: number; minMs: number; maxMs: number }> {
    const stats: Record<string, { count: number; avgMs: number; minMs: number; maxMs: number }> = {};

    for (const [stage] of this.records) {
      const stageStats = this.getStageStats(stage);
      if (stageStats) {
        stats[stage] = stageStats;
      }
    }

    return stats;
  }

  clear(): void {
    this.records.clear();
    this.activeRecords.clear();
  }
}

export const createLatencyTracker = (): LatencyTracker => {
  return new LatencyTracker();
};