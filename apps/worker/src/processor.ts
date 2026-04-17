import { randomUUID } from "node:crypto";

export type JobType = "send_whatsapp" | "generate_summary" | "process_callback" | "cleanup_session";

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  attempts: number;
  maxAttempts: number;
  scheduledAt: number;
  createdAt: number;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface JobProcessor<T = unknown> {
  process(job: Job<T>): Promise<void>;
}

export type JobHandler = <T>(job: Job<T>) => Promise<void>;

export class JobQueue {
  private readonly handlers = new Map<JobType, JobHandler>();
  private readonly jobs = new Map<string, Job>();
  private readonly queue: Job[] = [];
  private processing = false;

  register(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async enqueue<T>(type: JobType, payload: T, options?: { maxAttempts?: number; delayMs?: number }): Promise<Job> {
    const job: Job<T> = {
      id: `job_${randomUUID()}`,
      type,
      payload,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      scheduledAt: Date.now() + (options?.delayMs ?? 0),
      createdAt: Date.now(),
      status: "pending"
    };

    this.jobs.set(job.id, job as Job);
    this.queue.push(job as Job);
    this.processQueue();

    return job as Job;
  }

  async enqueueBulk(jobs: Array<{ type: JobType; payload: unknown }>): Promise<Job[]> {
    const results: Job[] = [];

    for (const { type, payload } of jobs) {
      const job = await this.enqueue(type, payload);
      results.push(job);
    }

    return results;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue[0];
      const now = Date.now();

      if (job.scheduledAt > now) {
        await new Promise((resolve) => setTimeout(resolve, job.scheduledAt - now));
      }

      this.queue.shift();
      await this.processJob(job);
    }

    this.processing = false;
  }

  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (!handler) {
      console.error(`[job-queue] no handler for job type: ${job.type}`);
      job.status = "failed";
      return;
    }

    job.status = "processing";
    job.attempts++;

    try {
      await handler(job);
      job.status = "completed";
    } catch (error) {
      console.error(`[job-queue] job failed: ${job.id}`, error);

      if (job.attempts < job.maxAttempts) {
        job.status = "pending";
        job.scheduledAt = Date.now() + Math.pow(2, job.attempts) * 1000;
        this.queue.push(job);
      } else {
        job.status = "failed";
      }
    }
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getQueueStatus(): { pending: number; processing: number; completed: number; failed: number } {
    let pending = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    this.jobs.forEach((job) => {
      switch (job.status) {
        case "pending":
          pending++;
          break;
        case "processing":
          processing++;
          break;
        case "completed":
          completed++;
          break;
        case "failed":
          failed++;
          break;
      }
    });

    return { pending, processing, completed, failed };
  }

  clear(): void {
    this.jobs.clear();
    this.queue.length = 0;
  }
}

export const createJobQueue = (): JobQueue => {
  return new JobQueue();
};