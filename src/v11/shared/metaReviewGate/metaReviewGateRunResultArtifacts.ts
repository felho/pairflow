import { writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { BubbleMetaReviewSnapshotState, MetaReviewRunStatus } from "../../../types/bubble.js";
import type { MetaReviewRunResult, MetaReviewRunWarning } from "../../../core/bubble/metaReview.js";
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

export function synthesizeMetaReviewRunResultFromSnapshot(input: {
  bubbleId: string;
  nowIso: string;
  snapshot: BubbleMetaReviewSnapshotState;
  fallbackSummary: string;
}): MetaReviewRunResult {
  const recommendation = input.snapshot.last_autonomous_recommendation ?? "inconclusive";
  const status: MetaReviewRunStatus =
    input.snapshot.last_autonomous_status ?? "error";
  const summary = input.snapshot.last_autonomous_summary ?? input.fallbackSummary;
  const reportRef =
    input.snapshot.last_autonomous_report_ref ?? metaReviewFallbackReportRef;
  const runId =
    input.snapshot.last_autonomous_run_id === null
      ? undefined
      : input.snapshot.last_autonomous_run_id;
  const updatedAt = input.snapshot.last_autonomous_updated_at ?? input.nowIso;
  const reworkTargetMessage = recommendation === "rework"
    ? (input.snapshot.last_autonomous_rework_target_message ?? null)
    : null;

  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status,
    recommendation,
    summary,
    report_ref: reportRef,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    ...(runId !== undefined ? { run_id: runId } : {})
  };
}

export function synthesizeMetaReviewRunFailure(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "error",
    recommendation: "inconclusive",
    summary: input.fallbackSummary,
    report_ref: metaReviewFallbackReportRef,
    rework_target_message: null,
    updated_at: input.nowIso,
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: []
  };
}

export function normalizeRecoveredMetaReviewRunResult(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
  runResult: MetaReviewRunResult;
  bubbleDir: string;
  artifactsDir: string;
}): MetaReviewRunResult {
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
    bubbleId: input.bubbleId,
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
  runResult: MetaReviewRunResult;
  paths: {
    metaReviewLastJsonArtifactPath: string;
  };
  writeFileFn?: typeof writeFile;
}): Promise<{ warnings: MetaReviewRunWarning[] }> {
  const writer = input.writeFileFn ?? writeFile;
  const warnings: MetaReviewRunWarning[] = [];

  const reportPayload = buildRecoveredMetaReviewReportPayload({
    bubbleId: input.bubbleId,
    round: input.round,
    nowIso: input.nowIso,
    runResult: input.runResult,
    recoveredWarnings: warnings
  });

  try {
    await writer(
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
