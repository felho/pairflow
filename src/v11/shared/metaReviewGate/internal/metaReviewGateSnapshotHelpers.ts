import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleAgentsConfig,
  type BubbleMetaReviewSnapshotState
} from "../../../../types/bubble.js";
import { resolveConfiguredAgentForRole } from "../../../../types/bubble.js";
import {
  resolveFindingsParityMetadataForEnvelope as resolveFindingsParityMetadataForEnvelopeFromProtocol,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";

export function resolveMetaReviewerAgent(agents: BubbleAgentsConfig) {
  return resolveConfiguredAgentForRole({
    agents,
    role: "meta_reviewer"
  });
}

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot !== undefined) {
    return {
      execution_context: snapshot.execution_context ?? null,
      runtime_delivery: snapshot.runtime_delivery ?? null,
      auto_rework_count: snapshot.auto_rework_count,
      auto_rework_limit: snapshot.auto_rework_limit,
      sticky_human_gate: snapshot.sticky_human_gate,
      consecutive_clean_runs: snapshot.consecutive_clean_runs ?? 0
    };
  }

  return {
    execution_context: null,
    runtime_delivery: null,
    auto_rework_count: 0,
    auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
    sticky_human_gate: false,
    consecutive_clean_runs: 0
  };
}

export { buildHumanGateSummary } from "../../../domain/metaReviewGate/humanGatePolicy.js";

export function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  return resolveFindingsParityMetadataForEnvelopeFromProtocol(metadata);
}
