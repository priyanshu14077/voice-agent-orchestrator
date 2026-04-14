export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppResponse {
  id: string;
  status: "queued" | "sent" | "delivered" | "failed";
  timestamp: number;
}

export interface WhatsAppClientOptions {
  phoneNumberId?: string;
  accessToken?: string;
  apiUrl?: string;
}

export class WhatsAppClient {
  private readonly phoneNumberId?: string;
  private readonly accessToken?: string;
  private readonly apiUrl: string;

  constructor(options: WhatsAppClientOptions = {}) {
    this.phoneNumberId = options.phoneNumberId;
    this.accessToken = options.accessToken;
    this.apiUrl = options.apiUrl ?? "https://graph.facebook.com/v18.0";
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn("[whatsapp] not configured, skipping send");
      return {
        id: `mock_${Date.now()}`,
        status: "queued",
        timestamp: Date.now()
      };
    }

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: message.to,
      type: message.mediaUrl ? "image" : "text",
      ...(message.mediaUrl
        ? {
            image: {
              link: message.mediaUrl
            }
          }
        : {
            text: {
              body: message.body
            }
          })
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      id: data.messages?.[0]?.id ?? `msg_${Date.now()}`,
      status: "queued",
      timestamp: Date.now()
    };
  }

  async sendText(to: string, body: string): Promise<WhatsAppResponse> {
    return this.sendMessage({ to, body });
  }

  async sendImage(to: string, body: string, mediaUrl: string): Promise<WhatsAppResponse> {
    return this.sendMessage({ to, body, mediaUrl });
  }

  async sendTemplate(
    to: string,
    templateName: string,
    components?: Record<string, unknown>[]
  ): Promise<WhatsAppResponse> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn("[whatsapp] not configured, skipping template send");
      return {
        id: `mock_${Date.now()}`,
        status: "queued",
        timestamp: Date.now()
      };
    }

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        components: components ?? []
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp template error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      id: data.messages?.[0]?.id ?? `msg_${Date.now()}`,
      status: "queued",
      timestamp: Date.now()
    };
  }
}

export const createWhatsAppClient = (options?: WhatsAppClientOptions): WhatsAppClient => {
  return new WhatsAppClient(options);
};