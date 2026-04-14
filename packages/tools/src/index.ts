import { ToolRegistry, createToolRegistry } from "./registry.js";
import { ToolExecutor, createToolExecutor } from "./executor.js";
import { createLogPromiseTool } from "./tools/log-promise.js";
import { createScheduleFollowupTool } from "./tools/schedule-followup.js";
import { createFlagDisputeTool } from "./tools/flag-dispute.js";

export { ToolRegistry, createToolRegistry } from "./registry.js";
export type { ToolDefinition, ToolExecutionContext, ToolResult } from "./registry.js";
export { ToolExecutor, createToolExecutor } from "./executor.js";
export type { ToolExecutorOptions } from "./executor.js";

export const createDefaultTools = (): ToolRegistry => {
  const registry = createToolRegistry();
  registry.register(createLogPromiseTool());
  registry.register(createScheduleFollowupTool());
  registry.register(createFlagDisputeTool());
  return registry;
};

export {
  createLogPromiseTool,
  createScheduleFollowupTool,
  createFlagDisputeTool
} from "./tools/index.js";

export type { LogPromiseInput, LogPromiseOutput } from "./tools/log-promise.js";
export type { ScheduleFollowupInput, ScheduleFollowupOutput } from "./tools/schedule-followup.js";
export type { FlagDisputeInput, FlagDisputeOutput } from "./tools/flag-dispute.js";