import "dotenv/config";

import { createJobQueue, type JobQueue, type JobHandler } from "./processor.js";
import { WhatsAppClient, createWhatsAppClient } from "./whatsapp.js";

export { createJobQueue, type JobQueue } from "./processor.js";
export { WhatsAppClient, createWhatsAppClient } from "./whatsapp.js";

export interface WorkerAppOptions {
  whatsapp?: {
    phoneNumberId?: string;
    accessToken?: string;
  };
  maxRetries?: number;
}

export const createWorkerApp = (options: WorkerAppOptions = {}) => {
  const queue = createJobQueue();
  const whatsapp = createWhatsAppClient(options.whatsapp);

  const sendWhatsAppHandler: JobHandler = async (job) => {
    const payload = job.payload as { to: string; body: string; mediaUrl?: string };
    await whatsapp.sendMessage(payload);
  };

  const sendReminderHandler: JobHandler = async (job) => {
    const payload = job.payload as { to: string; amount: string; dueDate: string };
    const body = `Reminder: You have an outstanding payment of ${payload.amount} due on ${payload.dueDate}. Please contact us to resolve.`;
    await whatsapp.sendText(payload.to, body);
  };

  const cleanupHandler: JobHandler = async (job) => {
    console.log("[worker] cleanup job", job.id);
  };

  queue.register("send_whatsapp", sendWhatsAppHandler);
  queue.register("process_callback", sendReminderHandler);
  queue.register("cleanup_session", cleanupHandler);

  return { queue, whatsapp };
};

const app = createWorkerApp({
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN
  }
});

console.log("[worker] started");