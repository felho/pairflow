export const validationCommandReservedIds = [
  "validation_required",
  "validation_required_explicit"
] as const;

export const builtInValidationCommandIds = [
  "lint",
  "typecheck",
  "test",
  "bootstrap"
] as const;

export type BuiltInValidationCommandId =
  (typeof builtInValidationCommandIds)[number];

export type ValidationCommandId = string;

export function isValidationCommandReservedId(value: string): boolean {
  return (validationCommandReservedIds as readonly string[]).includes(value);
}

export function isValidationCommandId(value: string): boolean {
  return /^[a-z][a-z0-9_-]{0,63}$/u.test(value)
    && !isValidationCommandReservedId(value);
}

export function describeValidationCommandIdRule(): string {
  return "Must match ^[a-z][a-z0-9_-]{0,63}$ and must not be a reserved validation control field.";
}
