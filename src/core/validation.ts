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
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z$/u.exec(
      value
    );
  if (match === null) {
    return false;
  }

  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];
  const hourText = match[4];
  const minuteText = match[5];
  const secondText = match[6];
  const fraction = match[7];

  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined ||
    hourText === undefined ||
    minuteText === undefined ||
    secondText === undefined
  ) {
    return false;
  }

  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const second = Number.parseInt(secondText, 10);
  const millisecond =
    fraction === undefined
      ? 0
      : Number.parseInt(fraction.padEnd(3, "0").slice(0, 3), 10);

  const parsed = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  );

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
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
