import type { Intent } from "@voice-agent/shared";

export const isIntent = (actual: Intent, expected: Intent): boolean => actual === expected;
