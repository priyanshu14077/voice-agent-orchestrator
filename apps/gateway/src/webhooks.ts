import type { IncomingMessage } from "node:http";

export interface TwilioWebhookPayload {
  CallSid: string;
  CallStatus: string;
  From: string;
  To: string;
  Direction: string;
  RecordingUrl?: string;
  TranscriptionText?: string;
}

export interface WhatsAppWebhookPayload {
  messaging_product: string;
  to: string;
  type: string;
  text?: { body: string };
  audio?: { id: string };
  image?: { id: string; caption?: string };
}

export type WebhookHandler = (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;

export interface WebhookHandlers {
  onTwilioCall?: WebhookHandler;
  onTwilioRecording?: WebhookHandler;
  onWhatsAppMessage?: WebhookHandler;
}

export class WebhookParser {
  static parseTwilioWebhook(body: string): TwilioWebhookPayload | null {
    try {
      const params = new URLSearchParams(body);
      return {
        CallSid: params.get("CallSid") ?? "",
        CallStatus: params.get("CallStatus") ?? "",
        From: params.get("From") ?? "",
        To: params.get("To") ?? "",
        Direction: params.get("Direction") ?? "",
        RecordingUrl: params.get("RecordingUrl") ?? undefined,
        TranscriptionText: params.get("TranscriptionText") ?? undefined
      };
    } catch {
      return null;
    }
  }

  static parseWhatsAppWebhook(body: string): WhatsAppWebhookPayload | null {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  static createTwilioResponse(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">${message}</Say>
</Response>`;
  }

  static createTwilioGatherResponse(message: string, numDigits: number = 1): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="${numDigits}" action="/webhooks/twilio/gather">
    <Say voice="Polly.Aditi">${message}</Say>
  </Gather>
  <Say voice="Polly.Aditi">We didn't receive input. Goodbye.</Say>
</Response>`;
  }

  static createWhatsAppTextMessage(body: string): WhatsAppWebhookPayload {
    return {
      messaging_product: "whatsapp",
      to: "",
      type: "text",
      text: { body }
    };
  }

  static createWhatsAppAudioMessage(audioId: string): WhatsAppWebhookPayload {
    return {
      messaging_product: "whatsapp",
      to: "",
      type: "audio",
      audio: { id: audioId }
    };
  }
}

export const handleTwilioStatusCallback = async (
  payload: TwilioWebhookPayload
): Promise<{ action: string; status: string }> => {
  switch (payload.CallStatus) {
    case "completed":
      return { action: "call_completed", status: "completed" };
    case "failed":
      return { action: "call_failed", status: "failed" };
    case "no-answer":
      return { action: "no_answer", status: "ignored" };
    default:
      return { action: "status_update", status: payload.CallStatus };
  }
};

export const handleWhatsAppMessage = async (
  payload: WhatsAppWebhookPayload,
  handlers?: WebhookHandlers
): Promise<Record<string, unknown>> => {
  if (!handlers?.onWhatsAppMessage) {
    return { success: false, reason: "no handler" };
  }

  return handlers.onWhatsAppMessage(payload);
};
