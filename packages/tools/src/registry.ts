export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema?: TInput;
  execute(input: TInput): Promise<TOutput>;
}

export interface ToolExecutionContext {
  callId: string;
  sessionId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ToolResult<TOutput = unknown> {
  ok: boolean;
  tool: string;
  output?: TOutput;
  error?: string;
  context: ToolExecutionContext;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[tool:registry] tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as ToolDefinition);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }
}

export const createToolRegistry = (): ToolRegistry => {
  return new ToolRegistry();
};