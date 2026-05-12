import type { LoadedDomainStateSnapshot } from "../../../../ports/stateSnapshots.js";
import type { AppendProtocolEnvelopeResult } from "../../../../ports/transcript.js";
import { MetaReviewGateError } from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type { MetaReviewGateResult } from "../../../../shared/metaReviewGate/metaReviewGateResultContract.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { transitionToGateState } from "../state/metaReviewGateStateHelpers.js";
import {
  resolveDefaultStickyHumanGateForRoute
} from "../../../../domain/metaReviewGate/humanGateRouting.js";
import {
  resolveHumanGateRecommendation,
  resolveRollbackAfterGateAppendFailure
} from "./metaReviewGateHumanGatePersistenceHelpers.js";
import {
  resolveAdvisoryFindingsFromReportJson
} from "../../../../domain/metaReviewGate/findingsSplit.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";
import type { PersistHumanGateRouteInput } from "./metaReviewGateHumanGatePersistenceContract.js";
import { appendHumanGateRequestForRoute } from "./metaReviewGateHumanGateRouteAppend.js";

export {
  metaReviewGateRollbackAppliedReasonCode,
  metaReviewGateRollbackNotAttemptedReasonCode,
  metaReviewGateRollbackStateConflictReasonCode,
  metaReviewGateRollbackTransitionInvalidReasonCode
} from "./metaReviewGateHumanGatePersistenceHelpers.js";

export type { PersistHumanGateRouteInput } from "./metaReviewGateHumanGatePersistenceContract.js";

function assertPersistHumanGateRouteInput(
  input: PersistHumanGateRouteInput
): void {
  if (
    input.metaReviewRun === undefined &&
    input.fallbackRecommendation === undefined
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      "META_REVIEW_GATE_TRANSITION_INVALID: persistHumanGateRoute requires metaReviewRun or fallbackRecommendation.",
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
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
    ...(input.consecutiveCleanRuns !== undefined
      ? { consecutiveCleanRuns: input.consecutiveCleanRuns }
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
  let written: LoadedDomainStateSnapshot;
  try {
    written = await input.writeState(input.statePath, nextState, {
      expectedFingerprint: input.loaded.fingerprint,
      expectedState: input.expectedState
    });
  } catch (error) {
    if (isNamedError(error, "StateStoreConflictError")) {
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
    gateAppended = await appendHumanGateRequestForRoute({
      persistInput: input,
      recommendation,
      advisoryFindings
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // rollbackStateOnAppendFailure is still persisted-shape (later batch);
    // wrap as variant so the Domain write port accepts it. loaded.state is
    // already variant.
    const rollbackState =
      input.rollbackStateOnAppendFailure !== undefined
        ? buildBubbleStateSnapshotVariant(input.rollbackStateOnAppendFailure)
        : input.loaded.state;
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
