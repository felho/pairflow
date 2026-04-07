import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../infrastructure/state/stateStore.js";
import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../types/bubble.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import type {
  appendProtocolEnvelope,
  AppendProtocolEnvelopeResult
} from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type MetaReviewGateRoute
} from "./metaReviewGateTypes.js";
import {
  resolveDefaultStickyHumanGateForRoute,
  transitionToGateState
} from "./metaReviewGateStateHelpers.js";
import {
  appendHumanGateApprovalRequest,
  resolveHumanGateRecommendation,
  resolveRollbackAfterGateAppendFailure
} from "./metaReviewGateHumanGatePersistenceHelpers.js";
import {
  resolveAdvisoryFindingsFromReportJson,
  type MetaReviewGateAdvisoryFinding
} from "./metaReviewGateFindingsSplit.js";

export {
  metaReviewGateRollbackAppliedReasonCode,
  metaReviewGateRollbackNotAttemptedReasonCode,
  metaReviewGateRollbackStateConflictReasonCode,
  metaReviewGateRollbackTransitionInvalidReasonCode
} from "./metaReviewGateHumanGatePersistenceHelpers.js";

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
  metaReviewRun?: MetaReviewResult;
  parityMetadata?: FindingsParityMetadata | null;
  findings?: MetaReviewGateAdvisoryFinding[];
  fallbackRecommendation?: MetaReviewRecommendation;
  targetState?: "READY_FOR_HUMAN_APPROVAL";
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

  const recommendation = resolveHumanGateRecommendation({
    ...(input.metaReviewRun !== undefined ? { metaReviewRun: input.metaReviewRun } : {}),
    ...(input.fallbackRecommendation !== undefined
      ? { fallbackRecommendation: input.fallbackRecommendation }
      : {})
  });
  const advisoryFindings =
    input.findings ??
    resolveAdvisoryFindingsFromReportJson(input.metaReviewRun?.report_json);
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
      ...(recommendation !== undefined ? { recommendation } : {}),
      ...(input.parityMetadata !== undefined
        ? { parityMetadata: input.parityMetadata }
        : {}),
      ...(advisoryFindings !== undefined ? { findings: advisoryFindings } : {})
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
