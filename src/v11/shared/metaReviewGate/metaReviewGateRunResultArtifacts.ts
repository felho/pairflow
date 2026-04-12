import { isAbsolute, relative, resolve } from "node:path";

import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { MetaReviewArtifactWritePort } from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewResult, MetaReviewRunWarning } from "../metaReview/metaReviewTypes.js";
import {
  buildMetaReviewArtifactWriteWarning,
  buildRecoveredMetaReviewReportPayload,
  metaReviewFallbackReportRef
} from "./metaReviewGateRunResultArtifactPayload.js";

function resolveRecoveredReportRef(input: {
  reportRef: string;
  bubbleDir: string;
  artifactsDir: string;
}): string {
  const reportRef = input.reportRef.trim();
  if (
    reportRef.length === 0 ||
    !reportRef.startsWith("artifacts/") ||
    reportRef.includes("..") ||
    reportRef.includes("\\") ||
    reportRef.includes("\0")
  ) {
    return metaReviewFallbackReportRef;
  }
  const resolvedPath = resolve(input.bubbleDir, reportRef);
  const relativeToArtifacts = relative(input.artifactsDir, resolvedPath);
  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    return metaReviewFallbackReportRef;
  }
  return reportRef;
}

export function synthesizeMetaReviewRunFailure(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
}): MetaReviewResult {
  return {
    bubble_id: input.bubbleId,
    status: "error",
    recommendation: "inconclusive",
    summary: input.fallbackSummary,
    report_ref: metaReviewFallbackReportRef,
    rework_target_message: null,
    updated_at: input.nowIso,
    warnings: []
  };
}

export function normalizeRecoveredMetaReviewRunResult(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
  runResult: MetaReviewResult;
  bubbleDir: string;
  artifactsDir: string;
}): MetaReviewResult {
  const normalizedSummary =
    typeof input.runResult.summary === "string"
      && input.runResult.summary.trim().length > 0
      ? input.runResult.summary
      : input.fallbackSummary;
  const normalizedUpdatedAt =
    typeof input.runResult.updated_at === "string" &&
      input.runResult.updated_at.trim().length > 0
      ? input.runResult.updated_at
      : input.nowIso;
  const normalizedReportRef =
    typeof input.runResult.report_ref === "string"
      ? resolveRecoveredReportRef({
          reportRef: input.runResult.report_ref,
          bubbleDir: input.bubbleDir,
          artifactsDir: input.artifactsDir
        })
      : metaReviewFallbackReportRef;

  return {
    ...input.runResult,
    bubble_id: input.bubbleId,
    summary: normalizedSummary,
    report_ref: normalizedReportRef,
    updated_at: normalizedUpdatedAt,
    rework_target_message:
      input.runResult.recommendation === "rework"
        ? (input.runResult.rework_target_message ?? null)
        : null,
    warnings: [...input.runResult.warnings]
  };
}

export async function writeRecoveredMetaReviewArtifacts(input: {
  bubbleId: string;
  round: number;
  nowIso: string;
  lifecycleState: BubbleStateSnapshot["state"];
  runResult: MetaReviewResult;
  paths: {
    metaReviewLastJsonArtifactPath: string;
  };
  writeFileFn: MetaReviewArtifactWritePort;
}): Promise<{ warnings: MetaReviewRunWarning[] }> {
  const warnings: MetaReviewRunWarning[] = [];

  const reportPayload = buildRecoveredMetaReviewReportPayload({
    bubbleId: input.bubbleId,
    round: input.round,
    nowIso: input.nowIso,
    lifecycleState: input.lifecycleState,
    runResult: input.runResult,
    recoveredWarnings: warnings
  });

  try {
    await input.writeFileFn(
      input.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    warnings.push(
      buildMetaReviewArtifactWriteWarning({
        artifactRef: metaReviewFallbackReportRef,
        error
      })
    );
  }

  return { warnings };
}
