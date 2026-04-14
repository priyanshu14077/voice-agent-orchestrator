import type { ToolDefinition } from "../registry.js";

export interface ScheduleFollowupInput {
  callId: string;
  phoneNumber?: string;
  scheduledTime: string;
  notes?: string;
}

export interface ScheduleFollowupOutput {
  scheduled: boolean;
  callId: string;
  scheduledTime: string;
}

export const createScheduleFollowupTool = (): ToolDefinition<ScheduleFollowupInput, ScheduleFollowupOutput> => {
  return {
    name: "schedule_followup",
    description: "Schedule a follow-up call or reminder",
    async execute(input): Promise<ScheduleFollowupOutput> {
      console.log("[tool:schedule_followup]", input);

      return {
        scheduled: true,
        callId: input.callId,
        scheduledTime: input.scheduledTime
      };
    }
  };
};