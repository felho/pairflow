import { readFile } from "node:fs/promises";

import {
  isReviewerFocusExtractionResult,
  type ReviewerFocusExtractionResult
} from "../../../shared/reviewer/reviewerBrief.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../../ports/reviewerArtifacts.js";

export const readReviewerBriefArtifact: ReadReviewerBriefArtifactPort = async (
  artifactPath: string
): Promise<string | undefined> => {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ENOENT"
        || error.code === "EISDIR"
        || error.code === "ENOTDIR"
      ) {
        return undefined;
      }
      throw error;
    }
  );
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return raw.trimEnd();
};

export const readReviewerFocusArtifact: ReadReviewerFocusArtifactPort = async (
  artifactPath: string
): Promise<ReviewerFocusExtractionResult | undefined> => {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ENOENT"
        || error.code === "EISDIR"
        || error.code === "ENOTDIR"
      ) {
        return undefined;
      }
      throw error;
    }
  );
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {
      status: "invalid",
      source: "none",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };
  }
  if (!isReviewerFocusExtractionResult(parsed)) {
    return undefined;
  }
  return parsed;
};
