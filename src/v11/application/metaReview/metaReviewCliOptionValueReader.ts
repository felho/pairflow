import { MetaReviewErrorV11 as MetaReviewError } from "./emitMetaReviewV11.js";
import {
  parseOptionalReworkTarget as parseOptionalReworkTargetValue,
  parseRequiredSubmitText as parseRequiredSubmitTextValue,
  parseSubmitRecommendation as parseSubmitRecommendationValue,
  parseSubmitReportJson as parseSubmitReportJsonValue,
  parseSubmitRound as parseSubmitRoundValue
} from "./metaReviewCliValueParsers.js";
import type { MetaReviewSubmissionPayload } from "../../../types/protocol.js";

function invalidMetaReviewCliOptions(message: string): never {
  throw new MetaReviewError(
    "META_REVIEW_SCHEMA_INVALID",
    `${message} context: command_name=meta-review.`
  );
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
  optionName: "--summary"
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
