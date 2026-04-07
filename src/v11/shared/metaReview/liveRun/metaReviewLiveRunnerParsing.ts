import { isNonEmptyString, isRecord } from "../../validation/primitives.js";
import type { MetaReviewReviewerVerdict } from "./metaReviewLiveRunContract.js";

export function parseMetaReviewRunnerOutput(
  raw: string
): MetaReviewReviewerVerdict {
  const normalizeJsonControlCharactersInStrings = (input: string): string => {
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
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    try {
      parsed = JSON.parse(normalizeJsonControlCharactersInStrings(raw));
    } catch {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`meta-review runner output is not valid JSON: ${reason}`);
    }
  }

  if (!isRecord(parsed)) {
    throw new Error("meta-review runner output must be a JSON object.");
  }

  const recommendationRaw = parsed.recommendation;
  if (
    recommendationRaw !== "approve" &&
    recommendationRaw !== "rework" &&
    recommendationRaw !== "inconclusive"
  ) {
    throw new Error(
      "meta-review runner output.recommendation must be one of: approve, rework, inconclusive."
    );
  }
  const recommendation = recommendationRaw;

  const summaryRaw = parsed.summary;
  if (!isNonEmptyString(summaryRaw)) {
    throw new Error("meta-review runner output.summary must be a non-empty string.");
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
      "meta-review runner output.rework_target_message must be string|null."
    );
  }

  if (recommendation === "rework" && !isNonEmptyString(reworkTargetMessage)) {
    throw new Error(
      "meta-review runner output.rework_target_message is required when recommendation=rework."
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
