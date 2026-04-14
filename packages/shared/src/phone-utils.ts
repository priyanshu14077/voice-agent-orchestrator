export const generateId = (prefix = ""): string => {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, "").slice(-10);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
};