import type { MetaReviewSubmissionPayload } from "../../../types/protocol.js";

type RaiseInvalidMetaReviewOption = (message: string) => never;

export function parseSubmitRound(
  value: string | undefined,
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): number {
  if (value === undefined) {
    return raiseInvalidOption(
      "Missing required option: --round for meta-review submit."
    );
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return raiseInvalidOption(
      "Invalid --round value. Must be a positive integer."
    );
  }
  return parsed;
}

export function parseSubmitRecommendation(
  value: string | undefined,
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): MetaReviewSubmissionPayload["recommendation"] {
  if (value === undefined) {
    return raiseInvalidOption(
      "Missing required option: --recommendation for meta-review submit."
    );
  }
  if (value === "approve" || value === "rework" || value === "inconclusive") {
    return value;
  }
  return raiseInvalidOption(
    "Invalid --recommendation value. Use one of: approve, rework, inconclusive."
  );
}

export function parseRequiredSubmitText(
  value: string | undefined,
  optionName: "--summary",
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): string {
  if (value === undefined) {
    return raiseInvalidOption(
      `Missing required option: ${optionName} for meta-review submit.`
    );
  }
  if (value.trim().length === 0) {
    return raiseInvalidOption(
      `Invalid ${optionName} value. Must be non-empty.`
    );
  }
  return value.trim();
}

export function parseOptionalReworkTarget(
  value: string | undefined,
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): string | null {
  if (value === undefined) {
    return null;
  }
  if (value.trim().length === 0) {
    return raiseInvalidOption(
      "Invalid --rework-target-message value. Must be non-empty when provided."
    );
  }
  return value.trim();
}

export function parseSubmitReportJson(
  value: string,
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return raiseInvalidOption(
      `Invalid --report-json value. Must be valid JSON object. ${message}`
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return raiseInvalidOption(
      "Invalid --report-json value. Must be a JSON object."
    );
  }
  return parsed as Record<string, unknown>;
}

export function readStringOption(
  values: Record<string, unknown>,
  key:
    | "id"
    | "repo"
    | "depth"
    | "round"
    | "recommendation"
    | "summary"
    | "rework-target-message"
    | "report-json",
  errorMessage: string,
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): string | undefined {
  const value = values[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return raiseInvalidOption(errorMessage);
  }
  return value;
}

export function readBooleanOption(
  values: Record<string, unknown>,
  key: "json" | "verbose",
  errorMessage: string,
  raiseInvalidOption: RaiseInvalidMetaReviewOption
): boolean | undefined {
  const value = values[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    return raiseInvalidOption(errorMessage);
  }
  return value;
}
