import { join } from "node:path";

import { appendHumanApprovalRequestEnvelope } from "../../../core/bubble/approvalRequestEnvelope.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  type BubbleStateSnapshot,
  type MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import {
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import type {
  appendProtocolEnvelope,
  AppendProtocolEnvelopeResult
} from "../../../core/protocol/transcriptStore.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type MetaReviewGateRoute
} from "./metaReviewGateTypes.js";
import {
  resolveDefaultStickyHumanGateForRoute,
  transitionToGateState
} from "./metaReviewGateStateHelpers.js";

export const metaReviewGateRollbackNotAttemptedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_NOT_ATTEMPTED";
export const metaReviewGateRollbackAppliedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_APPLIED";
export const metaReviewGateRollbackStateConflictReasonCode =
  "META_REVIEW_GATE_ROLLBACK_STATE_CONFLICT";
export const metaReviewGateRollbackTransitionInvalidReasonCode =
  "META_REVIEW_GATE_ROLLBACK_TRANSITION_INVALID";
export const metaReviewGateStagedReadyRestoreAppliedReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_APPLIED";
export const metaReviewGateStagedReadyRestoreStateConflictReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_STATE_CONFLICT";
export const metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode =
  "META_REVIEW_GATE_STAGED_READY_RESTORE_TRANSITION_INVALID";
export const metaReviewGatePaneDeactivationUnavoidableReasonCode =
  "META_REVIEW_GATE_PANE_DEACTIVATION_UNAVOIDABLE";
export {
  buildHumanGateSummary,
  buildHydratedMetaReviewSnapshotFromRunResult,
  incrementAutoReworkCount,
  metaReviewFallbackReportRef,
  metaReviewerAgent,
  metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode,
  normalizeMetaReviewSnapshot,
  resolveAutoReworkRetryInvariantViolation,
  resolveCanonicalMetaReviewRunId,
  resolveDefaultStickyHumanGateForRoute,
  resolveFindingsParityMetadataForEnvelope,
  resolveHumanGateRoute,
  transitionToGateState
} from "./metaReviewGateStateHelpers.js";

export function toConflictError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${reason}`
  );
}

export function toTransitionError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${reason}`
  );
}

export function assertRunningConvergenceState(state: BubbleStateSnapshot): void {
  if (state.state !== "RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate convergence route requires RUNNING state (current: ${state.state}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
}

export function buildGateLockPath(paths: { locksDir: string; bubbleId: string }): string {
  return join(paths.locksDir, `${paths.bubbleId}.lock`);
}

export async function persistHumanGateRoute(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  route: MetaReviewGateRoute;
  metaReviewRun?: MetaReviewRunResult;
  parityMetadata?: FindingsParityMetadata | null;
  fallbackRecommendation?: MetaReviewRecommendation;
  targetState?:
    | "READY_FOR_HUMAN_APPROVAL"
    | "READY_FOR_APPROVAL"
    | "META_REVIEW_FAILED";
  stickyHumanGate?: boolean;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}): Promise<MetaReviewGateResult> {
  if (
    input.metaReviewRun !== undefined &&
    input.fallbackRecommendation !== undefined
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: persistHumanGateRoute requires either metaReviewRun or fallbackRecommendation, but not both.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
  const targetState = input.targetState ?? "READY_FOR_HUMAN_APPROVAL";
  const stickyHumanGate =
    input.stickyHumanGate ?? resolveDefaultStickyHumanGateForRoute(input.route);
  const nextState = transitionToGateState({
    current: input.loaded.state,
    nowIso: input.nowIso,
    targetState,
    stickyHumanGate,
    ...(input.metaReviewRun !== undefined
      ? { metaReviewRun: input.metaReviewRun }
      : {}),
    ...(input.fallbackRecommendation !== undefined
      ? {
          fallbackRecommendation: input.fallbackRecommendation,
          fallbackSummary: input.summary
        }
      : {})
  });

  let written: LoadedStateSnapshot;
  try {
    written = await input.writeState(input.statePath, nextState, {
      expectedFingerprint: input.loaded.fingerprint,
      expectedState: input.expectedState
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw error;
  }

  let gateAppended: AppendProtocolEnvelopeResult;
  try {
    gateAppended = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: input.appendEnvelope,
      transcriptPath: input.transcriptPath,
      inboxPath: input.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      bubbleId: input.bubbleId,
      round: input.loaded.state.round,
      summary: input.summary,
      route: input.route,
      refs: input.refs,
      ...(input.metaReviewRun !== undefined
        ? { recommendation: input.metaReviewRun.recommendation }
        : input.fallbackRecommendation !== undefined
          ? { recommendation: input.fallbackRecommendation }
          : {}),
      parityMetadata: input.parityMetadata
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const rollbackState = input.rollbackStateOnAppendFailure ?? input.loaded.state;
    let rollbackContext = "rollback_outcome=not_attempted";
    let rollbackDiagnosticReasonCode = metaReviewGateRollbackNotAttemptedReasonCode;
    let rollbackOutcome: "not_attempted" | "applied" | "failed" = "not_attempted";
    let rollbackReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID" | "META_REVIEW_GATE_STATE_CONFLICT" =
      "META_REVIEW_GATE_TRANSITION_INVALID";
    try {
      await input.writeState(input.statePath, rollbackState, {
        expectedFingerprint: written.fingerprint,
        expectedState: targetState
      });
      rollbackContext = "rollback_outcome=applied";
      rollbackDiagnosticReasonCode = metaReviewGateRollbackAppliedReasonCode;
      rollbackOutcome = "applied";
    } catch (rollbackError) {
      if (rollbackError instanceof StateStoreConflictError) {
        rollbackReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
        rollbackDiagnosticReasonCode = metaReviewGateRollbackStateConflictReasonCode;
      } else {
        rollbackDiagnosticReasonCode = metaReviewGateRollbackTransitionInvalidReasonCode;
      }
      const rollbackReason = rollbackError instanceof Error
        ? rollbackError.message
        : String(rollbackError);
      rollbackContext = `rollback_outcome=failed rollback_error=${rollbackReason}`;
      rollbackOutcome = "failed";
    }
    throw new MetaReviewGateError(
      rollbackReasonCode,
      `${rollbackReasonCode}: state transitioned to ${targetState} but approval request append failed (rollback_reason_code=${rollbackDiagnosticReasonCode}; rollback_target_state=${rollbackState.state}; ${rollbackContext}). Root error: ${reason}`,
      {
        rollbackReasonCode: rollbackDiagnosticReasonCode,
        rollbackOutcome,
        rollbackTargetState: rollbackState.state
      }
    );
  }

  return {
    bubbleId: input.bubbleId,
    route: input.route,
    gateSequence: gateAppended.sequence,
    gateEnvelope: gateAppended.envelope,
    state: written.state,
    ...(input.metaReviewRun !== undefined ? { metaReviewRun: input.metaReviewRun } : {})
  };
}
