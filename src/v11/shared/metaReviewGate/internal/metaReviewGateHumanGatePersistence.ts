import {
  type LoadedStateSnapshot,
  type WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AgentName,
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../../types/bubble.js";
import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type MetaReviewGateRoute,
  type MetaReviewGateThresholdMetadata
} from "../metaReviewGateTypes.js";
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
} from "../../../domain/metaReviewGate/findingsSplit.js";
import { isNamedError } from "../../errors/namedError.js";

export {
  metaReviewGateRollbackAppliedReasonCode,
  metaReviewGateRollbackNotAttemptedReasonCode,
  metaReviewGateRollbackStateConflictReasonCode,
  metaReviewGateRollbackTransitionInvalidReasonCode
} from "./metaReviewGateHumanGatePersistenceHelpers.js";

export interface PersistHumanGateRouteInput {
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  metaReviewerAgent: AgentName;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  route: MetaReviewGateRoute;
  metaReviewRun?: MetaReviewResult;
  parityMetadata?: FindingsParityMetadata | null;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
  gateReasonCode?: string;
  findings?: MetaReviewGateAdvisoryFinding[];
  fallbackRecommendation?: MetaReviewRecommendation;
  targetState?: "READY_FOR_HUMAN_APPROVAL" | "RUNNING";
  stickyHumanGate?: boolean;
  consecutiveCleanRuns?: number;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}

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

async function appendHumanGateRequestForRoute(input: {
  persistInput: PersistHumanGateRouteInput;
  recommendation: MetaReviewRecommendation | undefined;
  advisoryFindings: MetaReviewGateAdvisoryFinding[] | undefined;
}): Promise<AppendProtocolEnvelopeResult> {
  const commonInput = {
    appendEnvelope: input.persistInput.appendEnvelope,
    transcriptPath: input.persistInput.transcriptPath,
    inboxPath: input.persistInput.inboxPath,
    lockPath: input.persistInput.lockPath,
    now: input.persistInput.now,
    bubbleId: input.persistInput.bubbleId,
    round: input.persistInput.loaded.state.round,
    summary: input.persistInput.summary,
    refs: input.persistInput.refs,
    metaReviewerAgent: input.persistInput.metaReviewerAgent,
    ...(input.persistInput.parityMetadata !== undefined
      ? { parityMetadata: input.persistInput.parityMetadata }
      : {}),
    ...(input.persistInput.gateReasonCode !== undefined
      ? { gateReasonCode: input.persistInput.gateReasonCode }
      : {}),
    ...(input.persistInput.consecutiveCleanRuns !== undefined
      ? { consecutiveCleanRuns: input.persistInput.consecutiveCleanRuns }
      : {}),
    ...(input.advisoryFindings !== undefined ? { findings: input.advisoryFindings } : {})
  };

  if (
    input.persistInput.route === "human_gate_threshold_not_met"
    || input.persistInput.route === "human_gate_threshold_unresolved"
  ) {
    if (input.recommendation !== "rework" || input.persistInput.thresholdMetadata === undefined) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        `META_REVIEW_GATE_TRANSITION_INVALID: threshold human-gate route ${input.persistInput.route} requires recommendation=rework and threshold metadata.`,
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return appendHumanGateApprovalRequest({
      ...commonInput,
      route: input.persistInput.route,
      recommendation: input.recommendation,
      thresholdMetadata: input.persistInput.thresholdMetadata
    });
  }

  return appendHumanGateApprovalRequest({
    ...commonInput,
    route: input.persistInput.route,
    ...(input.recommendation !== undefined ? { recommendation: input.recommendation } : {})
  });
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
  let written: LoadedStateSnapshot;
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
