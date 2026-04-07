import { isAbsolute, relative, resolve } from "node:path";

import {
  isRecord
} from "../validation/primitives.js";
import {
  emptyMetaReviewFindingsParitySnapshot,
  readMetaReviewFindingsParitySnapshot,
  type MetaReviewFindingsParitySnapshot
} from "./metaReviewRuntimeParity.js";
import { isMissingFileError } from "./metaReviewCommandErrorMapping.js";
import { MetaReviewError } from "./metaReviewError.js";
import type { MetaReviewArtifactReadPort } from "./metaReviewArtifactIo.js";

const metaReviewParityArtifactReadFailedReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_READ_FAILED";
const metaReviewParityArtifactParseFailedReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED";
const metaReviewParityArtifactShapeInvalidReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_SHAPE_INVALID";
const metaReviewParityArtifactReportJsonInvalidReasonCode =
  "META_REVIEW_PARITY_REPORT_JSON_INVALID";

export interface MetaReviewParityArtifactReadResult {
  parity: MetaReviewFindingsParitySnapshot;
  diagnostics: string[];
  snapshotRound: number | null;
  snapshotRoundIdentity: "present" | "missing" | "unavailable";
}

function resolveParityArtifactReadErrorCode(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code.trim().toUpperCase();
    }
  }
  return "UNKNOWN";
}

export function resolveReportArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  reportRef: string;
}): string {
  if (
    !input.reportRef.startsWith("artifacts/") ||
    input.reportRef.includes("..") ||
    input.reportRef.includes("\\") ||
    input.reportRef.includes("\0")
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "Invalid meta-review report_ref; expected a safe artifacts/* reference."
    );
  }

  const resolvedReportPath = resolve(input.bubbleDir, input.reportRef);
  const relativeToArtifacts = relative(input.artifactsDir, resolvedReportPath);

  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "Invalid meta-review report_ref; resolved path escapes artifacts directory."
    );
  }

  return resolvedReportPath;
}

export function readMetaReviewParitySnapshotFromArtifactRaw(
  artifactRaw: string
): MetaReviewParityArtifactReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(artifactRaw);
  } catch {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactParseFailedReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  if (!isRecord(parsed)) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactShapeInvalidReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  if (
    "report_json" in parsed &&
    parsed.report_json !== undefined &&
    !isRecord(parsed.report_json)
  ) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactReportJsonInvalidReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  const reportJson = isRecord(parsed.report_json)
    ? parsed.report_json
    : parsed;
  const snapshotRound =
    typeof parsed.round === "number" && Number.isInteger(parsed.round) && parsed.round > 0
      ? parsed.round
      : null;

  return {
    parity: readMetaReviewFindingsParitySnapshot(reportJson),
    diagnostics: [],
    snapshotRound,
    snapshotRoundIdentity: snapshotRound === null ? "missing" : "present"
  };
}

export async function readMetaReviewParitySnapshotFromArtifact(input: {
  artifactPath: string;
  readFileFn: MetaReviewArtifactReadPort;
}): Promise<MetaReviewParityArtifactReadResult> {
  let artifactRaw: string;
  try {
    artifactRaw = await input.readFileFn(input.artifactPath, "utf8");
  } catch (error) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [
        `${metaReviewParityArtifactReadFailedReasonCode}:${resolveParityArtifactReadErrorCode(error)}`
      ],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  return readMetaReviewParitySnapshotFromArtifactRaw(artifactRaw);
}

export async function readMetaReviewReportJsonArtifact(input: {
  artifactPath: string;
  readFileFn: MetaReviewArtifactReadPort;
}): Promise<{
  hasReport: boolean;
  reportJson: Record<string, unknown> | null;
}> {
  try {
    const reportRaw = await input.readFileFn(input.artifactPath, "utf8");
    const parsed: unknown = JSON.parse(reportRaw);
    if (isRecord(parsed) && isRecord(parsed.report_json)) {
      return { hasReport: true, reportJson: parsed.report_json };
    }
    if (isRecord(parsed)) {
      return { hasReport: true, reportJson: parsed };
    }
    return { hasReport: true, reportJson: null };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { hasReport: false, reportJson: null };
    }
    return { hasReport: true, reportJson: null };
  }
}
