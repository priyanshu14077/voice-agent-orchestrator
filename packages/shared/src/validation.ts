export interface ValidationRule<T> {
  validate(value: T): boolean;
  message: string;
}

export const required = <T>(message = "Field is required"): ValidationRule<T> => ({
  validate: (value) => value !== null && value !== undefined && value !== "",
  message
});

export const minLength = (min: number, message?: string): ValidationRule<string> => ({
  validate: (value) => typeof value === "string" && value.length >= min,
  message: message ?? `Minimum length is ${min}`
});

export const maxLength = (max: number, message?: string): ValidationRule<string> => ({
  validate: (value) => typeof value === "string" && value.length <= max,
  message: message ?? `Maximum length is ${max}`
});

export const pattern = (regex: RegExp, message: string): ValidationRule<string> => ({
  validate: (value) => typeof value === "string" && regex.test(value),
  message
});

export const isNumber = (message = "Must be a number"): ValidationRule<unknown> => ({
  validate: (value) => typeof value === "number" && !isNaN(value),
  message
});

export const inRange = (min: number, max: number, message?: string): ValidationRule<number> => ({
  validate: (value) => typeof value === "number" && value >= min && value <= max,
  message: message ?? `Must be between ${min} and ${max}`
});

export const validate = <T>(value: T, rules: ValidationRule<T>[]): string[] => {
  const errors: string[] = [];
  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }
  return errors;
};