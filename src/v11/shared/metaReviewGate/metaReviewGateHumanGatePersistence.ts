import { appendHumanApprovalRequestEnvelope } from "../../../core/bubble/approvalRequestEnvelope.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
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

export interface PersistHumanGateRouteInput {
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
}

function assertPersistHumanGateRouteInput(
  input: PersistHumanGateRouteInput
): void {
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
}

function resolveHumanGateRecommendation(
  input: PersistHumanGateRouteInput
): MetaReviewRecommendation | undefined {
  if (input.metaReviewRun !== undefined) {
    return input.metaReviewRun.recommendation;
  }
  return input.fallbackRecommendation;
}

async function appendHumanGateApprovalRequest(input: {
  routeInput: PersistHumanGateRouteInput;
  recommendation: MetaReviewRecommendation | undefined;
}): Promise<AppendProtocolEnvelopeResult> {
  return appendHumanApprovalRequestEnvelope({
    appendEnvelope: input.routeInput.appendEnvelope,
    transcriptPath: input.routeInput.transcriptPath,
    inboxPath: input.routeInput.inboxPath,
    lockPath: input.routeInput.lockPath,
    now: input.routeInput.now,
    bubbleId: input.routeInput.bubbleId,
    round: input.routeInput.loaded.state.round,
    summary: input.routeInput.summary,
    route: input.routeInput.route,
    refs: input.routeInput.refs,
    ...(input.recommendation !== undefined
      ? { recommendation: input.recommendation }
      : {}),
    parityMetadata: input.routeInput.parityMetadata
  });
}

async function resolveRollbackAfterGateAppendFailure(input: {
  writeState: typeof writeStateSnapshot;
  statePath: string;
  rollbackState: BubbleStateSnapshot;
  expectedFingerprint: string;
  expectedState: "READY_FOR_HUMAN_APPROVAL" | "READY_FOR_APPROVAL" | "META_REVIEW_FAILED";
}): Promise<{
  rollbackContext: string;
  rollbackDiagnosticReasonCode: string;
  rollbackOutcome: "not_attempted" | "applied" | "failed";
  rollbackReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID" | "META_REVIEW_GATE_STATE_CONFLICT";
}> {
  let rollbackContext = "rollback_outcome=not_attempted";
  let rollbackDiagnosticReasonCode = metaReviewGateRollbackNotAttemptedReasonCode;
  let rollbackOutcome: "not_attempted" | "applied" | "failed" = "not_attempted";
  let rollbackReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID" | "META_REVIEW_GATE_STATE_CONFLICT" =
    "META_REVIEW_GATE_TRANSITION_INVALID";
  try {
    await input.writeState(input.statePath, input.rollbackState, {
      expectedFingerprint: input.expectedFingerprint,
      expectedState: input.expectedState
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
  return {
    rollbackContext,
    rollbackDiagnosticReasonCode,
    rollbackOutcome,
    rollbackReasonCode
  };
}

export async function persistHumanGateRoute(
  input: PersistHumanGateRouteInput
): Promise<MetaReviewGateResult> {
  assertPersistHumanGateRouteInput(input);
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

  const recommendation = resolveHumanGateRecommendation(input);
  let written: LoadedStateSnapshot;
  try {
    written = await input.writeState(input.statePath, nextState, {
      expectedFingerprint: input.loaded.fingerprint,
      expectedState: input.expectedState
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      const reason = error instanceof Error ? error.message : String(error);
      // reason_code=META_REVIEW_GATE_STATE_CONFLICT state_path expected_state
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        `META_REVIEW_GATE_STATE_CONFLICT: ${reason}`
      );
    }
    throw error;
  }

  let gateAppended: AppendProtocolEnvelopeResult;
  try {
    gateAppended = await appendHumanGateApprovalRequest({
      routeInput: input,
      recommendation
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const rollbackState = input.rollbackStateOnAppendFailure ?? input.loaded.state;
    const rollbackResult = await resolveRollbackAfterGateAppendFailure({
      writeState: input.writeState,
      statePath: input.statePath,
      rollbackState,
      expectedFingerprint: written.fingerprint,
      expectedState: targetState
    });
    throw new MetaReviewGateError(
      rollbackResult.rollbackReasonCode,
      `${rollbackResult.rollbackReasonCode}: state transitioned to ${targetState} but approval request append failed (rollback_reason_code=${rollbackResult.rollbackDiagnosticReasonCode}; rollback_target_state=${rollbackState.state}; ${rollbackResult.rollbackContext}). Root error: ${reason}`,
      {
        rollbackReasonCode: rollbackResult.rollbackDiagnosticReasonCode,
        rollbackOutcome: rollbackResult.rollbackOutcome,
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
