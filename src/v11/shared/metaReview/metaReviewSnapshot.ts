import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../types/bubble.js";
import type {
  BubbleMetaReviewExecutionContext,
  BubbleMetaReviewRuntimeDeliveryState,
  BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";

export interface ActiveMetaReviewRuntimeDeliveryView {
  status: BubbleMetaReviewRuntimeDeliveryState["status"];
  reasonCode: string | null;
  message: string;
  observedAt: string;
  observedForHandoffId: string | null;
  observedForRound: number | null;
}

export interface MetaReviewRuntimeDeliveryCorrelation {
  observedForHandoffId: string | null;
  observedForRound: number | null;
}

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot === undefined) {
    return {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false,
      consecutive_clean_runs: 0
    };
  }

  return {
    execution_context: snapshot.execution_context ?? null,
    runtime_delivery: snapshot.runtime_delivery ?? null,
    auto_rework_count: snapshot.auto_rework_count,
    auto_rework_limit: snapshot.auto_rework_limit,
    sticky_human_gate: snapshot.sticky_human_gate,
    consecutive_clean_runs: snapshot.consecutive_clean_runs ?? 0
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

export function buildMetaReviewRuntimeDeliveryCorrelation(
  executionContext: BubbleMetaReviewExecutionContext | null | undefined
): MetaReviewRuntimeDeliveryCorrelation {
  if (executionContext === null || executionContext === undefined) {
    return {
      observedForHandoffId: null,
      observedForRound: null
    };
  }

  return {
    observedForHandoffId: executionContext.handoff_id,
    observedForRound: executionContext.round
  };
}

export function normalizeMetaReviewRuntimeDeliveryCorrelation(input: {
  observedForHandoffId: string | null | undefined;
  observedForRound: number | null | undefined;
}): MetaReviewRuntimeDeliveryCorrelation {
  const observedForHandoffId = input.observedForHandoffId ?? null;
  const observedForRound = input.observedForRound ?? null;
  if (
    (observedForHandoffId === null) !== (observedForRound === null)
  ) {
    return {
      observedForHandoffId: null,
      observedForRound: null
    };
  }

  return {
    observedForHandoffId,
    observedForRound
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
  const correlation = normalizeMetaReviewRuntimeDeliveryCorrelation({
    observedForHandoffId: runtimeDelivery.observed_for_handoff_id,
    observedForRound: runtimeDelivery.observed_for_round
  });
  if (
    correlation.observedForHandoffId === null ||
    correlation.observedForRound === null
  ) {
    return null;
  }
  if (
    correlation.observedForHandoffId !== executionContext.handoff_id
  ) {
    return null;
  }
  if (correlation.observedForRound !== executionContext.round) {
    return null;
  }
  return runtimeDelivery;
}

export function projectActiveMetaReviewRuntimeDelivery(input: {
  executionContext: BubbleMetaReviewExecutionContext | null | undefined;
  runtimeDelivery: BubbleMetaReviewRuntimeDeliveryState | null | undefined;
}): ActiveMetaReviewRuntimeDeliveryView | null {
  const activeRuntimeDelivery = resolveActiveMetaReviewRuntimeDelivery(input);
  if (activeRuntimeDelivery === null) {
    return null;
  }

  const observedForHandoffId = activeRuntimeDelivery.observed_for_handoff_id;
  const observedForRound = activeRuntimeDelivery.observed_for_round;
  if (observedForHandoffId === null || observedForRound === null) {
    return null;
  }

  return {
    status: activeRuntimeDelivery.status,
    reasonCode: activeRuntimeDelivery.reason_code,
    message: activeRuntimeDelivery.message,
    observedAt: activeRuntimeDelivery.observed_at,
    observedForHandoffId,
    observedForRound
  };
}
