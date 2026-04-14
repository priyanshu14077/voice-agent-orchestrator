import type { ToolDefinition, ToolExecutionContext, ToolResult, ToolRegistry } from "./registry.js";

export interface ToolExecutorOptions {
  registry: ToolRegistry;
  onExecute?: (toolName: string, input: unknown) => void;
  onResult?: (result: ToolResult) => void;
}

export class ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly hooks: {
    onExecute?: (toolName: string, input: unknown) => void;
    onResult?: (result: ToolResult) => void;
  };

  constructor(options: ToolExecutorOptions) {
    this.registry = options.registry;
    this.hooks = {
      onExecute: options.onExecute,
      onResult: options.onResult
    };
  }

  async execute<TInput = unknown, TOutput = unknown>(
    toolName: string,
    input: TInput,
    context: ToolExecutionContext
  ): Promise<ToolResult<TOutput>> {
    const tool = this.registry.get(toolName) as ToolDefinition<TInput, TOutput> | undefined;

    if (!tool) {
      const result: ToolResult<TOutput> = {
        ok: false,
        tool: toolName,
        error: `Tool not found: ${toolName}`,
        context
      };
      this.hooks.onResult?.(result);
      return result;
    }

    this.hooks.onExecute?.(toolName, input);

    try {
      const output = await tool.execute(input);

      const result: ToolResult<TOutput> = {
        ok: true,
        tool: toolName,
        output,
        context
      };

      this.hooks.onResult?.(result);
      return result;
    } catch (error) {
      const result: ToolResult<TOutput> = {
        ok: false,
        tool: toolName,
        error: error instanceof Error ? error.message : String(error),
        context
      };

      this.hooks.onResult?.(result);
      return result;
    }
  }

  async executeBatch(
    tools: Array<{ name: string; input: unknown }>,
    context: ToolExecutionContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const { name, input } of tools) {
      const result = await this.execute(name, input, context);
      results.push(result);
    }

    return results;
  }
}

export const createToolExecutor = (options: ToolExecutorOptions): ToolExecutor => {
  return new ToolExecutor(options);
};