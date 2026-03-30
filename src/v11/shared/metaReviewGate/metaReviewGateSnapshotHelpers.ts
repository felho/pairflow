import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import {
  resolveFindingsParityMetadataForEnvelope as resolveFindingsParityMetadataForEnvelopeFromProtocol,
  type FindingsParityMetadata
} from "../../../types/protocol.js";

export const metaReviewFallbackReportRef = "artifacts/meta-review-last.json";
export const metaReviewerAgent = "codex";

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot !== undefined) {
    return snapshot;
  }

  return {
    execution_context: null,
    runtime_delivery: null,
    last_autonomous_run_id: null,
    last_autonomous_status: null,
    last_autonomous_recommendation: null,
    last_autonomous_summary: null,
    last_autonomous_report_ref: null,
    last_autonomous_rework_target_message: null,
    last_autonomous_updated_at: null,
    auto_rework_count: 0,
    auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
    sticky_human_gate: false
  };
}

export function buildHumanGateSummary(input: {
  convergenceSummary: string;
  metaReviewRun?: MetaReviewRunResult;
  fallbackReason?: string;
}): string {
  if (input.fallbackReason !== undefined) {
    return input.fallbackReason;
  }
  const runSummary = input.metaReviewRun?.summary;
  if (typeof runSummary === "string" && runSummary.trim().length > 0) {
    return runSummary;
  }
  return input.convergenceSummary;
}

export function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  return resolveFindingsParityMetadataForEnvelopeFromProtocol(metadata);
}

export function buildHydratedMetaReviewSnapshotFromRunResult(input: {
  metaReview: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): BubbleMetaReviewSnapshotState {
  return {
    ...input.metaReview,
    last_autonomous_run_id: input.runResult.run_id ?? null,
    last_autonomous_status: input.runResult.status,
    last_autonomous_recommendation: input.runResult.recommendation,
    last_autonomous_summary: input.runResult.summary,
    last_autonomous_report_ref: input.runResult.report_ref,
    last_autonomous_rework_target_message:
      input.runResult.recommendation === "rework"
        ? (
            typeof input.runResult.rework_target_message === "string" &&
            input.runResult.rework_target_message.trim().length > 0
              ? input.runResult.rework_target_message
              : "Meta-review gate fallback rework target unavailable."
          )
        : null,
    last_autonomous_updated_at: input.runResult.updated_at
  };
}

export function resolveCanonicalMetaReviewRunId(
  snapshot: BubbleMetaReviewSnapshotState
): string | null {
  if (
    typeof snapshot.last_autonomous_run_id === "string" &&
    snapshot.last_autonomous_run_id.trim().length > 0
  ) {
    return snapshot.last_autonomous_run_id.trim();
  }
  return null;
}
