import { isNonEmptyString, isRecord } from "../../validation/primitives.js";
import type { MetaReviewReviewerVerdict } from "./metaReviewLiveRunContract.js";

function normalizeJsonControlCharactersInStrings(input: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (const char of input) {
    if (!inString) {
      if (char === "\"") {
        inString = true;
      }
      output += char;
      continue;
    }

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaped = true;
      continue;
    }

    if (char === "\"") {
      output += char;
      inString = false;
      continue;
    }

    if (char === "\n") {
      output += "\\n";
      continue;
    }
    if (char === "\r") {
      output += "\\r";
      continue;
    }
    if (char === "\t") {
      output += "\\t";
      continue;
    }

    const codePoint = char.charCodeAt(0);
    if (codePoint >= 0x00 && codePoint < 0x20) {
      output += `\\u${codePoint.toString(16).padStart(4, "0")}`;
      continue;
    }

    output += char;
  }

  return output;
}

function parseMetaReviewRunnerJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    try {
      return JSON.parse(normalizeJsonControlCharactersInStrings(raw));
    } catch {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `META_REVIEW_RUNNER_OUTPUT_INVALID_JSON: context parser=json; reason=${reason}`
      );
    }
  }

}

function normalizeMetaReviewRunnerVerdict(parsed: unknown): MetaReviewReviewerVerdict {
  if (!isRecord(parsed)) {
    throw new Error(
      `META_REVIEW_RUNNER_OUTPUT_OBJECT_REQUIRED: context parsed_type=${typeof parsed}`
    );
  }

  const recommendationRaw = parsed.recommendation;
  if (
    recommendationRaw !== "approve" &&
    recommendationRaw !== "rework" &&
    recommendationRaw !== "inconclusive"
  ) {
    throw new Error(
      `META_REVIEW_RUNNER_RECOMMENDATION_INVALID: context recommendation=${String(recommendationRaw)}`
    );
  }
  const recommendation = recommendationRaw;

  const summaryRaw = parsed.summary;
  if (!isNonEmptyString(summaryRaw)) {
    throw new Error(
      `META_REVIEW_RUNNER_SUMMARY_INVALID: context summary_type=${typeof summaryRaw}`
    );
  }
  const summary = summaryRaw.trim();

  const reworkRaw = parsed.rework_target_message;
  let reworkTargetMessage: string | null;
  if (reworkRaw === null || reworkRaw === undefined) {
    reworkTargetMessage = null;
  } else if (isNonEmptyString(reworkRaw)) {
    reworkTargetMessage = reworkRaw.trim();
  } else {
    throw new Error(
      `META_REVIEW_RUNNER_REWORK_TARGET_INVALID: context rework_target_type=${typeof reworkRaw}`
    );
  }

  if (recommendation === "rework" && !isNonEmptyString(reworkTargetMessage)) {
    throw new Error(
      "META_REVIEW_RUNNER_REWORK_TARGET_REQUIRED: context recommendation=rework"
    );
  }
  if (recommendation !== "rework") {
    reworkTargetMessage = null;
  }

  return {
    recommendation,
    summary,
    rework_target_message: reworkTargetMessage
  };
}

export function parseMetaReviewRunnerOutput(
  raw: string
): MetaReviewReviewerVerdict {
  const parsed = parseMetaReviewRunnerJson(raw);
  return normalizeMetaReviewRunnerVerdict(parsed);
}

export function extractMetaReviewDelimitedBlock(input: {
  text: string;
  beginMarker: string;
  endMarker: string;
}): string | null {
  const beginIndex = input.text.lastIndexOf(input.beginMarker);
  if (beginIndex < 0) {
    return null;
  }
  const payloadStart = beginIndex + input.beginMarker.length;
  const endIndex = input.text.indexOf(input.endMarker, payloadStart);
  if (endIndex < 0) {
    return null;
  }
  const payload = input.text.slice(payloadStart, endIndex).trim();
  return payload.length === 0 ? null : payload;
}

export function truncateForErrorOutput(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}...`;
}
