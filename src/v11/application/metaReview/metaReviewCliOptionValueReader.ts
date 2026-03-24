import { MetaReviewErrorV11 as MetaReviewError, type MetaReviewDepthV11 as MetaReviewDepth } from "./emitMetaReviewV11.js";
import {
  parseDepth as parseDepthValue,
  parseOptionalReworkTarget as parseOptionalReworkTargetValue,
  parseRequiredSubmitText as parseRequiredSubmitTextValue,
  parseSubmitRecommendation as parseSubmitRecommendationValue,
  parseSubmitReportJson as parseSubmitReportJsonValue,
  parseSubmitRound as parseSubmitRoundValue,
  readBooleanOption as readBooleanOptionValue,
  readStringOption as readStringOptionValue
} from "./metaReviewCliValueParsers.js";
import type { MetaReviewSubmissionPayload } from "../../../types/protocol.js";

export interface ParsedMetaReviewOptionValues {
  id: string;
  repo: string | undefined;
  depth: string | undefined;
  round: string | undefined;
  recommendation: string | undefined;
  summary: string | undefined;
  reportMarkdown: string | undefined;
  reworkTargetMessage: string | undefined;
  reportJson: string | undefined;
  json: boolean;
  verbose: boolean;
}

function invalidMetaReviewCliOptions(message: string): never {
  throw new MetaReviewError(
    "META_REVIEW_SCHEMA_INVALID",
    `${message} context: command_name=meta-review.`
  );
}

export function parseDepth(value: string | undefined): MetaReviewDepth {
  return parseDepthValue(value, invalidMetaReviewCliOptions);
}

export function parseSubmitRound(value: string | undefined): number {
  return parseSubmitRoundValue(value, invalidMetaReviewCliOptions);
}

export function parseSubmitRecommendation(
  value: string | undefined
): MetaReviewSubmissionPayload["recommendation"] {
  return parseSubmitRecommendationValue(
    value,
    invalidMetaReviewCliOptions
  );
}

export function parseRequiredSubmitText(
  value: string | undefined,
  optionName: "--summary" | "--report-markdown"
): string {
  return parseRequiredSubmitTextValue(
    value,
    optionName,
    invalidMetaReviewCliOptions
  );
}

export function parseOptionalReworkTarget(value: string | undefined): string | null {
  return parseOptionalReworkTargetValue(
    value,
    invalidMetaReviewCliOptions
  );
}

export function parseRequiredSubmitReportJson(
  value: string | undefined
): Record<string, unknown> {
  if (value === undefined) {
    return invalidMetaReviewCliOptions(
      "Missing required option: --report-json"
    );
  }
  return parseSubmitReportJsonValue(value, invalidMetaReviewCliOptions);
}

function readStringOption(
  values: Record<string, unknown>,
  key:
    | "id"
    | "repo"
    | "depth"
    | "round"
    | "recommendation"
    | "summary"
    | "report-markdown"
    | "rework-target-message"
    | "report-json",
  errorMessage: string
): string | undefined {
  return readStringOptionValue(
    values,
    key,
    errorMessage,
    invalidMetaReviewCliOptions
  );
}

function readBooleanOption(
  values: Record<string, unknown>,
  key: "json" | "verbose",
  errorMessage: string
): boolean | undefined {
  return readBooleanOptionValue(
    values,
    key,
    errorMessage,
    invalidMetaReviewCliOptions
  );
}

export function parseMetaReviewCliOptionValues(
  values: Record<string, unknown>
): ParsedMetaReviewOptionValues {
  const id = readStringOption(values, "id", "Invalid --id value.");
  if (id === undefined) {
    return invalidMetaReviewCliOptions("Missing required option: --id");
  }
  if (id.trim().length === 0) {
    return invalidMetaReviewCliOptions("Invalid --id value. Must be non-empty.");
  }

  return {
    id,
    repo: readStringOption(values, "repo", "Invalid --repo value."),
    depth: readStringOption(values, "depth", "Invalid --depth value."),
    round: readStringOption(values, "round", "Invalid --round value."),
    recommendation: readStringOption(
      values,
      "recommendation",
      "Invalid --recommendation value."
    ),
    summary: readStringOption(values, "summary", "Invalid --summary value."),
    reportMarkdown: readStringOption(
      values,
      "report-markdown",
      "Invalid --report-markdown value."
    ),
    reworkTargetMessage: readStringOption(
      values,
      "rework-target-message",
      "Invalid --rework-target-message value."
    ),
    reportJson: readStringOption(values, "report-json", "Invalid --report-json value."),
    json: readBooleanOption(values, "json", "Invalid --json value.") ?? false,
    verbose: readBooleanOption(values, "verbose", "Invalid --verbose value.") ?? false
  };
}

export function invalidMetaReviewCliOptionsWithContext(message: string): never {
  return invalidMetaReviewCliOptions(message);
}
