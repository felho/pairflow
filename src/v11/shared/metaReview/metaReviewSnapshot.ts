import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../types/bubble.js";
import type {
  BubbleMetaReviewExecutionContext,
  BubbleMetaReviewRuntimeDeliveryState,
  BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot === undefined) {
    return {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false
    };
  }

  return {
    execution_context: snapshot.execution_context ?? null,
    runtime_delivery: snapshot.runtime_delivery ?? null,
    auto_rework_count: snapshot.auto_rework_count,
    auto_rework_limit: snapshot.auto_rework_limit,
    sticky_human_gate: snapshot.sticky_human_gate
  };
}

export function clearLiveMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  const normalized = normalizeMetaReviewSnapshot(snapshot);
  return {
    ...normalized,
    execution_context: null,
    runtime_delivery: null,
    sticky_human_gate: false
  };
}

export function resolveActiveMetaReviewRuntimeDelivery(input: {
  executionContext: BubbleMetaReviewExecutionContext | null | undefined;
  runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState | null | undefined;
}): BubbleMetaReviewRuntimeDeliveryState | null {
  const executionContext = input.executionContext ?? null;
  const runtimeDelivery = input.runtimeDelivery ?? null;
  if (executionContext === null || runtimeDelivery === null) {
    return null;
  }
  if (
    runtimeDelivery.observed_for_handoff_id === null ||
    runtimeDelivery.observed_for_round === null
  ) {
    return null;
  }
  if (
    runtimeDelivery.observed_for_handoff_id !== executionContext.handoff_id
  ) {
    return null;
  }
  if (runtimeDelivery.observed_for_round !== executionContext.round) {
    return null;
  }
  return runtimeDelivery;
}
