import {
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../../v11/shared/validation/primitives.js";

export function readString(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): string | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (!isNonEmptyString(value)) {
    errors.push({ path, message: "Must be a non-empty string" });
    return undefined;
  }

  return value;
}

export function readBoolean(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): boolean | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (typeof value !== "boolean") {
    errors.push({ path, message: "Must be a boolean" });
    return undefined;
  }

  return value;
}

export function readObject(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): Record<string, unknown> | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required section" });
    }
    return undefined;
  }

  if (!isRecord(value)) {
    errors.push({ path, message: "Must be an object/section" });
    return undefined;
  }

  return value;
}

export function readStringArray(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): string[] | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (!Array.isArray(value)) {
    errors.push({ path, message: "Must be an array of non-empty strings" });
    return undefined;
  }

  const result: string[] = [];
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push({
        path: `${path}[${index}]`,
        message: "Must be a non-empty string"
      });
      return;
    }
    result.push(item.trim());
  });

  return result;
}

export function describeUnknownValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number"
    || typeof value === "boolean"
    || value === null
    || value === undefined
  ) {
    return `${value}`;
  }
  if (Array.isArray(value)) {
    return "[array]";
  }
  if (isRecord(value)) {
    return "[object]";
  }
  return `[${typeof value}]`;
}
