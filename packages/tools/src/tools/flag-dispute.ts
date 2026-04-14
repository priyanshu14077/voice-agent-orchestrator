import type { ToolDefinition } from "../registry.js";

export interface FlagDisputeInput {
  callId: string;
  phoneNumber?: string;
  disputeReason?: string;
  priority?: "low" | "medium" | "high";
}

export interface FlagDisputeOutput {
  flagged: boolean;
  callId: string;
  priority: string;
}

export const createFlagDisputeTool = (): ToolDefinition<FlagDisputeInput, FlagDisputeOutput> => {
  return {
    name: "flag_dispute",
    description: "Flag a call for dispute resolution",
    async execute(input): Promise<FlagDisputeOutput> {
      console.log("[tool:flag_dispute]", input);

      return {
        flagged: true,
        callId: input.callId,
        priority: input.priority ?? "medium"
      };
    }
  };
};