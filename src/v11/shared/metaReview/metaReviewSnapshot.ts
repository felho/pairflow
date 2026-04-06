import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../types/bubble.js";
import type {
  BubbleMetaReviewExecutionContext,
  BubbleMetaReviewRuntimeDeliveryState,
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import { isNonEmptyString } from "../../../core/validation.js";
import { validateActiveMetaReviewExecutionContext } from "./metaReviewExecutionContext.js";

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot === undefined) {
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

  return snapshot;
}

export function clearLiveMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  const normalized = normalizeMetaReviewSnapshot(snapshot);
  return {
    ...normalized,
    execution_context: null,
    runtime_delivery: null,
    last_autonomous_run_id: null,
    last_autonomous_status: null,
    last_autonomous_recommendation: null,
    last_autonomous_summary: null,
    last_autonomous_report_ref: null,
    last_autonomous_rework_target_message: null,
    last_autonomous_updated_at: null,
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

export function hasCanonicalSubmitForActiveMetaReviewRound(input: {
  state: BubbleStateSnapshot;
  snapshot: BubbleMetaReviewSnapshotState;
}): boolean {
  const executionContextResult = validateActiveMetaReviewExecutionContext(
    input.state
  );
  if (!executionContextResult.ok) {
    return false;
  }
  if (
    input.snapshot.last_autonomous_status === null ||
    input.snapshot.last_autonomous_recommendation === null ||
    !isNonEmptyString(input.snapshot.last_autonomous_report_ref) ||
    !isNonEmptyString(input.snapshot.last_autonomous_updated_at)
  ) {
    return false;
  }

  const activeSinceMs = Date.parse(executionContextResult.value.started_at);
  const deadlineAtMs = Date.parse(executionContextResult.value.deadline_at);
  const updatedAtMs = Date.parse(input.snapshot.last_autonomous_updated_at);
  if (
    Number.isNaN(activeSinceMs) ||
    Number.isNaN(deadlineAtMs) ||
    Number.isNaN(updatedAtMs)
  ) {
    return false;
  }
  return updatedAtMs >= activeSinceMs && updatedAtMs <= deadlineAtMs;
}
