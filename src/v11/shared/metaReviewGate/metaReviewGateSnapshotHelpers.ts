import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import {
  resolveFindingsParityMetadataForEnvelope as resolveFindingsParityMetadataForEnvelopeFromProtocol,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
export const metaReviewerAgent = "codex";

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot !== undefined) {
    return {
      execution_context: snapshot.execution_context ?? null,
      runtime_delivery: snapshot.runtime_delivery ?? null,
      auto_rework_count: snapshot.auto_rework_count,
      auto_rework_limit: snapshot.auto_rework_limit,
      sticky_human_gate: snapshot.sticky_human_gate
    };
  }

  return {
    execution_context: null,
    runtime_delivery: null,
    auto_rework_count: 0,
    auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
    sticky_human_gate: false
  };
}

export function buildHumanGateSummary(input: {
  convergenceSummary: string;
  metaReviewRun?: {
    summary: string | null;
  };
  fallbackReason?: string;
}): string {
  const runSummary = input.metaReviewRun?.summary?.trim();
  if (input.fallbackReason !== undefined) {
    if (
      typeof runSummary === "string"
      && runSummary.length > 0
      && runSummary !== input.fallbackReason
    ) {
      return `${input.fallbackReason} Meta-review summary: ${runSummary}`;
    }
    return input.fallbackReason;
  }
  if (typeof runSummary === "string" && runSummary.length > 0) {
    return runSummary;
  }
  return input.convergenceSummary;
}

export function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  return resolveFindingsParityMetadataForEnvelopeFromProtocol(metadata);
}
