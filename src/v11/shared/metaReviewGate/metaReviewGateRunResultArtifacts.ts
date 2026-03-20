import { writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { BubbleMetaReviewSnapshotState, MetaReviewRunStatus } from "../../../types/bubble.js";
import type { MetaReviewRunResult, MetaReviewRunWarning } from "../../../core/bubble/metaReview.js";

const metaReviewFallbackReportRef = "artifacts/meta-review-last.md";
const metaReviewFallbackReportJsonRef = "artifacts/meta-review-last.json";

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

function buildRecoveredMetaReviewReportMarkdown(input: {
  bubbleId: string;
  runResult: MetaReviewRunResult;
  nowIso: string;
}): string {
  const summary =
    input.runResult.summary ??
    `Meta-review recovery route recorded recommendation=${input.runResult.recommendation}.`;
  const runIdLine =
    typeof input.runResult.run_id === "string" && input.runResult.run_id.trim().length > 0
      ? [`- Run: ${input.runResult.run_id}`]
      : [];

  return [
    "# Meta Review Report",
    "",
    `- Bubble: ${input.bubbleId}`,
    ...runIdLine,
    `- Generated: ${input.nowIso}`,
    `- Recommendation: ${input.runResult.recommendation}`,
    `- Status: ${input.runResult.status}`,
    "",
    "## Summary",
    "",
    summary
  ].join("\n");
}

export async function writeRecoveredMetaReviewArtifacts(input: {
  bubbleId: string;
  round: number;
  nowIso: string;
  runResult: MetaReviewRunResult;
  paths: {
    metaReviewLastJsonArtifactPath: string;
    metaReviewLastMarkdownArtifactPath: string;
  };
  writeFileFn?: typeof writeFile;
}): Promise<{ warnings: MetaReviewRunWarning[] }> {
  const writer = input.writeFileFn ?? writeFile;
  const warnings: MetaReviewRunWarning[] = [];

  const markdown = buildRecoveredMetaReviewReportMarkdown({
    bubbleId: input.bubbleId,
    runResult: input.runResult,
    nowIso: input.nowIso
  });
  try {
    await writer(
      input.paths.metaReviewLastMarkdownArtifactPath,
      `${markdown.trimEnd()}\n`,
      "utf8"
    );
  } catch (error) {
    warnings.push({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message: `${metaReviewFallbackReportRef}: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  const reportPayload = {
    bubble_id: input.bubbleId,
    round: input.round,
    generated_at: input.nowIso,
    status: input.runResult.status,
    recommendation: input.runResult.recommendation,
    summary: input.runResult.summary,
    report_ref: input.runResult.report_ref,
    report_json_ref: metaReviewFallbackReportJsonRef,
    warnings: [
      ...input.runResult.warnings,
      ...warnings
    ],
    ...(input.runResult.run_id !== undefined
      ? { run_id: input.runResult.run_id }
      : {}),
    rework_target_message: input.runResult.rework_target_message,
    lifecycle_state: input.runResult.lifecycle_state,
    ...(input.runResult.report_json !== undefined
      ? { report_json: input.runResult.report_json }
      : {})
  };

  try {
    await writer(
      input.paths.metaReviewLastJsonArtifactPath,
      `${JSON.stringify(reportPayload, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    warnings.push({
      reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
      message: `${metaReviewFallbackReportJsonRef}: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return { warnings };
}
