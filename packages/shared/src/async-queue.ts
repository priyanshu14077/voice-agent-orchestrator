export interface AsyncQueueItem<T> {
  id: string;
  data: T;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export class AsyncQueue<T> {
  private readonly queue: AsyncQueueItem<T>[] = [];
  private processing = false;
  private readonly concurrency: number;
  private active = 0;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  async enqueue<R = unknown>(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        data,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.active >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.active < this.concurrency) {
      const item = this.queue.shift();
      if (!item) continue;

      this.active++;
      this.processItem(item).finally(() => {
        this.active--;
        this.process();
      });
    }

    this.processing = false;
  }

  private async processItem(item: AsyncQueueItem<T>): Promise<void> {
    try {
      const result = await this.execute(item.data);
      item.resolve(result);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  protected async execute(data: T): Promise<unknown> {
    return data;
  }

  get size(): number {
    return this.queue.length;
  }

  get pending(): number {
    return this.active;
  }
}