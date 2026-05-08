import type { ReviewVerificationValidationError } from "../../reviewVerificationContract.js";

export interface ReviewVerificationValidationEntry {
  code: string;
  message: string;
  path?: string;
}

export function validateReviewVerificationValidationEntry(
  entry: unknown,
  entryPath: string,
  errors: ReviewVerificationValidationError[]
): ReviewVerificationValidationEntry | undefined {
  if (
    entry === null ||
    typeof entry !== "object" ||
    Array.isArray(entry)
  ) {
    errors.push({
      code: "validation_error_invalid",
      path: entryPath,
      message: "validation error entry must be an object."
    });
    return undefined;
  }

  const record = entry as Record<string, unknown>;
  if (typeof record.code !== "string" || record.code.trim().length === 0) {
    errors.push({
      code: "validation_error_code_invalid",
      path: `${entryPath}.code`,
      message: "validation error code must be a non-empty string."
    });
  }
  if (
    typeof record.message !== "string" ||
    record.message.trim().length === 0
  ) {
    errors.push({
      code: "validation_error_message_invalid",
      path: `${entryPath}.message`,
      message: "validation error message must be a non-empty string."
    });
  }
  if (
    record.path !== undefined &&
    (typeof record.path !== "string" || record.path.trim().length === 0)
  ) {
    errors.push({
      code: "validation_error_path_invalid",
      path: `${entryPath}.path`,
      message: "validation error path must be a non-empty string when provided."
    });
  }

  if (
    typeof record.code === "string" &&
    typeof record.message === "string"
  ) {
    return {
      code: record.code,
      message: record.message,
      ...(typeof record.path === "string" ? { path: record.path } : {})
    };
  }

  return undefined;
}
