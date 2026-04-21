import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { SessionManager, type SessionState } from "./session-manager.js";

export interface HttpServerOptions {
  port: number;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
}

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

type RouteHandler = (req: IncomingMessage, params: URLSearchParams) => Promise<JsonResponse>;

interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

const routes: Route[] = [
  {
    method: "GET",
    path: "/health",
    handler: async () => ({
      status: 200,
      body: { status: "healthy", timestamp: Date.now() }
    })
  },
  {
    method: "GET",
    path: "/sessions",
    handler: async (_req, params) => {
      const limit = Number(params.get("limit") ?? 50);
      return {
        status: 200,
        body: { sessions: [], limit }
      };
    }
  },
  {
    method: "GET",
    path: "/sessions/:callId",
    handler: async (_req, params) => {
      const callId = params.get("callId");
      if (!callId) {
        return { status: 400, body: { error: "callId required" } };
      }
      return {
        status: 200,
        body: {
          callId,
          state: "unknown",
          transcripts: []
        }
      };
    }
  },
  {
    method: "GET",
    path: "/calls",
    handler: async (_req, params) => {
      const offset = Number(params.get("offset") ?? 0);
      const limit = Number(params.get("limit") ?? 20);
      return {
        status: 200,
        body: { calls: [], offset, limit }
      };
    }
  },
  {
    method: "POST",
    path: "/calls/:callId/end",
    handler: async (_req, params) => {
      const callId = params.get("callId");
      return {
        status: 200,
        body: { callId, action: "end_call", success: true }
      };
    }
  },
  {
    method: "POST",
    path: "/webhooks/twilio",
    handler: async (_req) => {
      return {
        status: 200,
        body: { message: "TwiML response", twiml: "<Response><Say>Hello</Say></Response>" }
      };
    }
  },
  {
    method: "GET",
    path: "/metrics",
    handler: async () => {
      return {
        status: 200,
        body: {
          active_sessions: 0,
          total_calls: 0,
          uptime_seconds: process.uptime()
        }
      };
    }
  }
];

export class HttpServer {
  private readonly server = createServer();

  constructor(
    private readonly options: HttpServerOptions,
    private readonly sessions?: SessionManager
  ) {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.server.on("request", async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost`);
      const method = req.method ?? "GET";
      const path = url.pathname;
      const params = url.searchParams;

      if (method === "OPTIONS") {
        this.sendJson(res, { status: 200, body: {} });
        return;
      }

      const route = routes.find((r) => r.method === method && this.matchPath(r.path, path));

      if (!route) {
        this.sendJson(res, { status: 404, body: { error: "Not found" } });
        return;
      }

      try {
        const response = await route.handler(req, params);
        this.sendJson(res, response);
      } catch (error) {
        this.sendJson(res, {
          status: 500,
          body: { error: error instanceof Error ? error.message : "Internal error" }
        });
      }
    });
  }

  private matchPath(pattern: string, path: string): boolean {
    if (pattern === path) return true;
    
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, i) => {
      if (part.startsWith(":")) return true;
      return part === pathParts[i];
    });
  }

  private sendJson(res: ServerResponse, response: JsonResponse): void {
    res.writeHead(response.status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    res.end(JSON.stringify(response.body));
  }

  start(): void {
    this.server.listen(this.options.port, () => {
      console.log(`[http-server] listening on :${this.options.port}`);
    });
  }
}

export const createHttpServer = (options: HttpServerOptions, sessions?: SessionManager): HttpServer => {
  return new HttpServer(options, sessions);
};