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

export interface SchemaValidationErrorContext {
  source: "assert_validation";
  errorCount: number;
  firstErrorPath?: string | undefined;
}

export interface SchemaValidationErrorInput {
  message: string;
  errors: ValidationError[];
  context?: SchemaValidationErrorContext | undefined;
}

export class SchemaValidationError extends Error {
  public readonly errors: ValidationError[];
  public readonly context: SchemaValidationErrorContext | undefined;

  public constructor(
    message: string | SchemaValidationErrorInput,
    errors?: ValidationError[],
    context?: SchemaValidationErrorContext
  ) {
    const normalized =
      typeof message === "string"
        ? {
          message,
          errors: errors ?? [],
          context
        }
        : message;
    super(normalized.message);
    this.name = "SchemaValidationError";
    this.errors = normalized.errors;
    this.context = normalized.context;
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

export function isValidTcpPort(value: unknown): value is number {
  return isInteger(value) && value >= 1 && value <= 65535;
}

export function validateTcpPortList(input: {
  value: unknown;
  path: string;
  errors: ValidationError[];
  invalidArrayMessage: string;
  invalidEntryMessage: string;
}): number[] | undefined {
  if (input.value === undefined) {
    return undefined;
  }

  if (!Array.isArray(input.value)) {
    input.errors.push({
      path: input.path,
      message: input.invalidArrayMessage
    });
    return undefined;
  }

  const ports: number[] = [];
  let hasEntryError = false;
  input.value.forEach((entry, index) => {
    if (!isValidTcpPort(entry)) {
      hasEntryError = true;
      input.errors.push({
        path: `${input.path}[${index}]`,
        message: input.invalidEntryMessage
      });
      return;
    }
    ports.push(entry);
  });

  return hasEntryError ? undefined : ports;
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

  throw new SchemaValidationError({
    message,
    errors: result.errors,
    context: {
      source: "assert_validation",
      errorCount: result.errors.length,
      firstErrorPath: result.errors[0]?.path
    }
  });
}
