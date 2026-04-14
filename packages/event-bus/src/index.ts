export type EventCallback<T = unknown> = (payload: T) => void | Promise<void>;

export interface Subscription<T = unknown> {
  id: string;
  event: string;
  callback: EventCallback<T>;
  priority?: number;
}

export class EventBus {
  private readonly subscriptions = new Map<string, Subscription[]>();
  private readonly onceSubscriptions = new Map<string, Subscription[]>();
  private idCounter = 0;

  subscribe<T = unknown>(event: string, callback: EventCallback<T>, priority = 0): string {
    const id = `sub_${++this.idCounter}`;
    const subscription: Subscription<T> = { id, event, callback: callback as EventCallback, priority };

    const subs = this.subscriptions.get(event) ?? [];
    subs.push(subscription);
    subs.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.subscriptions.set(event, subs);

    return id;
  }

  subscribeOnce<T = unknown>(event: string, callback: EventCallback<T>): string {
    const id = `once_${++this.idCounter}`;
    const subscription: Subscription<T> = { id, event, callback: callback as EventCallback };

    const subs = this.onceSubscriptions.get(event) ?? [];
    subs.push(subscription);
    this.onceSubscriptions.set(event, subs);

    return id;
  }

  unsubscribe(id: string): boolean {
    for (const [event, subs] of this.subscriptions) {
      const index = subs.findIndex((s) => s.id === id);
      if (index !== -1) {
        subs.splice(index, 1);
        return true;
      }
    }

    for (const [event, subs] of this.onceSubscriptions) {
      const index = subs.findIndex((s) => s.id === id);
      if (index !== -1) {
        subs.splice(index, 1);
        return true;
      }
    }

    return false;
  }

  async publish<T = unknown>(event: string, payload?: T): Promise<void> {
    const subs = this.subscriptions.get(event) ?? [];
    const onceSubs = this.onceSubscriptions.get(event) ?? [];

    const allSubs = [...subs, ...onceSubs];

    const promises = allSubs.map(async (sub) => {
      try {
        await sub.callback(payload);
      } catch (error) {
        console.error(`[event-bus] handler error for ${event}:`, error);
      }
    });

    await Promise.all(promises);

    if (onceSubs.length > 0) {
      this.onceSubscriptions.delete(event);
    }
  }

  hasSubscribers(event: string): boolean {
    const subs = this.subscriptions.get(event) ?? [];
    const onceSubs = this.onceSubscriptions.get(event) ?? [];
    return subs.length > 0 || onceSubs.length > 0;
  }

  getSubscriberCount(event: string): number {
    const subs = this.subscriptions.get(event) ?? [];
    const onceSubs = this.onceSubscriptions.get(event) ?? [];
    return subs.length + onceSubs.length;
  }

  clear(event?: string): void {
    if (event) {
      this.subscriptions.delete(event);
      this.onceSubscriptions.delete(event);
    } else {
      this.subscriptions.clear();
      this.onceSubscriptions.clear();
    }
  }
}

export const createEventBus = (): EventBus => {
  return new EventBus();
};