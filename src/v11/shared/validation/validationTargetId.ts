import {
  describeValidationCommandIdRule,
  isValidationCommandId
} from "./validationCommandId.js";

export const reservedValidationTargetIds = [
  "id",
  "commands",
  "required",
  "default",
  "cwd",
  "paths",
  "targets",
  "validation",
  "lint",
  "test",
  "typecheck",
  "bootstrap"
] as const;

export function isReservedValidationTargetId(value: string): boolean {
  return (reservedValidationTargetIds as readonly string[]).includes(value);
}

export function isValidationTargetId(value: string): boolean {
  return isValidationCommandId(value) && !isReservedValidationTargetId(value);
}

export function describeValidationTargetIdRule(): string {
  return `${describeValidationCommandIdRule()} Target id must not be reserved.`;
}
