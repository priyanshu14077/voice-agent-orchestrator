import { randomBytes } from "node:crypto";

const MAX_PHONE_LENGTH = 50;

export const generateId = (prefix = ""): string => {
  const randomSuffix = randomBytes(8).toString("hex");
  return `${prefix}${Date.now()}_${randomSuffix}`;
};

export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== "string") return "";
  if (phone.length > MAX_PHONE_LENGTH) return "";
  return phone.replace(/\D/g, "").slice(-10);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") return false;
  if (phone.length > MAX_PHONE_LENGTH) return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
};