export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationOk<T> {
  ok: true;
  value: T;
}

export interface ValidationFail {
  ok: false;
  errors: ValidationError[];
}

export type ValidationResult<T> = ValidationOk<T> | ValidationFail;

export class SchemaValidationError extends Error {
  public readonly errors: ValidationError[];

  public constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = "SchemaValidationError";
    this.errors = errors;
  }
}

export function validationOk<T>(value: T): ValidationOk<T> {
  return {
    ok: true,
    value
  };
}

export function validationFail(errors: ValidationError[]): ValidationFail {
  return {
    ok: false,
    errors
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  // Strict UTC ISO-8601 shape used by transcript/state timestamps.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/u.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function assertValidation<T>(
  result: ValidationResult<T>,
  message: string
): T {
  if (result.ok) {
    return result.value;
  }

  throw new SchemaValidationError(message, result.errors);
}
