import {
  StateStoreConflictError,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import {
  normalizeMetaReviewSnapshot
} from "../../v11/shared/metaReview/metaReviewSnapshot.js";
import type {
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../types/bubble.js";
import {
  stateWriteConflictToMetaReviewError
} from "./metaReviewLiveRunErrors.js";
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunWarning
} from "./metaReviewLiveRunContract.js";

export function buildNextMetaReviewStateSnapshot(input: {
  loadedState: LoadedStateSnapshot;
  runId: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  reworkTargetMessage: string | null;
  updatedAt: string;
  reportRef: string;
}): BubbleStateSnapshot {
  const previousMetaReview = normalizeMetaReviewSnapshot(
    input.loadedState.state.meta_review
  );
  const lifecycleBaseState = input.loadedState.state;
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
    ...previousMetaReview,
    execution_context: previousMetaReview.execution_context ?? null,
    last_autonomous_run_id: input.runId,
    last_autonomous_status: input.status,
    last_autonomous_recommendation: input.recommendation,
    last_autonomous_summary: input.summary,
    last_autonomous_report_ref: input.reportRef,
    last_autonomous_rework_target_message: input.reworkTargetMessage,
    last_autonomous_updated_at: input.updatedAt,
    ...(input.loadedState.state.state === "READY_FOR_HUMAN_APPROVAL"
    && input.status === "success"
      ? { sticky_human_gate: true }
      : {})
  };

  return {
    ...lifecycleBaseState,
    meta_review: nextMetaReview
  };
}

export async function persistMetaReviewStateSnapshot(input: {
  statePath: string;
  loadedState: LoadedStateSnapshot;
  nextState: BubbleStateSnapshot;
  writeStateFn: NonNullable<MetaReviewDependencies["writeStateSnapshot"]>;
}): Promise<LoadedStateSnapshot> {
  try {
    return await input.writeStateFn(input.statePath, input.nextState, {
      expectedFingerprint: input.loadedState.fingerprint,
      expectedState: input.loadedState.state.state
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw stateWriteConflictToMetaReviewError(error);
    }
    throw error;
  }
}

export function buildMetaReviewRunResult(input: {
  bubbleId: string;
  runId: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  reportRef: string;
  reworkTargetMessage: string | null;
  updatedAt: string;
  warnings: MetaReviewRunWarning[];
  canonicalReportJson: Record<string, unknown>;
}): MetaReviewResult {
  return {
    bubble_id: input.bubbleId,
    run_id: input.runId,
    status: input.status,
    recommendation: input.recommendation,
    summary: input.summary,
    report_ref: input.reportRef,
    rework_target_message: input.reworkTargetMessage,
    updated_at: input.updatedAt,
    warnings: input.warnings,
    report_json: input.canonicalReportJson
  };
}

