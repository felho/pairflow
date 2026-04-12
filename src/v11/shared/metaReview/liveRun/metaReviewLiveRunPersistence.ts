import {
  type LoadedStateSnapshot
} from "../../ports/stateSnapshots.js";
import {
  normalizeMetaReviewSnapshot
} from "../metaReviewSnapshot.js";
import type {
  BubbleMetaReviewSnapshotState,
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../../types/bubble.js";
import {
  MetaReviewError
} from "../metaReviewError.js";
import {
  stateWriteConflictToMetaReviewError
} from "./metaReviewLiveRunErrors.js";
import type {
  MetaReviewDependencies,
  MetaReviewResult,
  MetaReviewRunWarning
} from "./metaReviewLiveRunContract.js";
import { isNamedError } from "../../errors/namedError.js";

export function buildNextMetaReviewStateSnapshot(input: {
  loadedState: LoadedStateSnapshot;
  stickyHumanGate: boolean;
}): BubbleStateSnapshot {
  const previousMetaReview = normalizeMetaReviewSnapshot(
    input.loadedState.state.meta_review
  );
  const lifecycleBaseState = input.loadedState.state;
  const nextMetaReview: BubbleMetaReviewSnapshotState = {
    ...previousMetaReview,
    sticky_human_gate: input.stickyHumanGate
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
    if (isNamedError(error, "StateStoreConflictError")) {
      const normalizedError = stateWriteConflictToMetaReviewError(error);
      throw new MetaReviewError(
        normalizedError.reasonCode,
        `${normalizedError.reasonCode}: context state_path=${input.statePath}; ${normalizedError.message}`
      );
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
