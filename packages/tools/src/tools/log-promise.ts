import type { ToolDefinition } from "../registry.js";

export interface LogPromiseInput {
  callId: string;
  amount?: number;
  date?: string;
  phoneNumber?: string;
}

export interface LogPromiseOutput {
  recorded: boolean;
  callId: string;
  amount?: number;
  date?: string;
}

export const createLogPromiseTool = (): ToolDefinition<LogPromiseInput, LogPromiseOutput> => {
  return {
    name: "log_promise_to_pay",
    description: "Record a borrower's promise to pay",
    async execute(input): Promise<LogPromiseOutput> {
      console.log("[tool:log_promise]", input);

      return {
        recorded: true,
        callId: input.callId,
        amount: input.amount,
        date: input.date
      };
    }
  };
};