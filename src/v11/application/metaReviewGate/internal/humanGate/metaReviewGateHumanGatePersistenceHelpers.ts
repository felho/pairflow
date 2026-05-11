import type { MetaReviewRecommendation } from "../../../../shared/metaReview/metaReviewTypes.js";
import { appendHumanApprovalRequestEnvelope } from "./approvalRequestEnvelope.js";
import {
  type WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/bubbleStateSnapshotTypes.js";
import type { FindingsParityMetadata } from "../../../../../types/protocol.js";
import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../../../ports/transcript.js";
import type { MetaReviewGateRoute } from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type { MetaReviewGateThresholdMetadata } from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type { MetaReviewGateAdvisoryFinding } from "../../../../domain/metaReviewGate/findingsSplit.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";

export const metaReviewGateRollbackNotAttemptedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_NOT_ATTEMPTED";
export const metaReviewGateRollbackAppliedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_APPLIED";
export const metaReviewGateRollbackStateConflictReasonCode =
  "META_REVIEW_GATE_ROLLBACK_STATE_CONFLICT";
export const metaReviewGateRollbackTransitionInvalidReasonCode =
  "META_REVIEW_GATE_ROLLBACK_TRANSITION_INVALID";

export interface ResolveRollbackAfterGateAppendFailureInput {
  writeState: WriteStateSnapshotPort;
  statePath: string;
  rollbackState: BubbleStateSnapshot;
  expectedFingerprint: string;
  expectedState: "READY_FOR_HUMAN_APPROVAL" | "RUNNING";
}

export interface ResolveRollbackAfterGateAppendFailureResult {
  rollbackContext: string;
  rollbackDiagnosticReasonCode: string;
  rollbackOutcome: "not_attempted" | "applied" | "failed";
  rollbackReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID" | "META_REVIEW_GATE_STATE_CONFLICT";
}

export { resolveHumanGateRecommendation } from "../../../../domain/metaReviewGate/humanGatePolicy.js";

export type AppendHumanGateApprovalRequestInput = {
  appendEnvelope: AppendProtocolEnvelopePort;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  summary: string;
  refs: string[];
  metaReviewerAgent: AgentName;
  parityMetadata?: FindingsParityMetadata | null;
  findings?: MetaReviewGateAdvisoryFinding[];
  gateReasonCode?: string;
  consecutiveCleanRuns?: number;
}
  & (
    | {
        route: "human_gate_threshold_not_met" | "human_gate_threshold_unresolved";
        recommendation: "rework";
        thresholdMetadata: MetaReviewGateThresholdMetadata;
      }
    | {
        route: Exclude<
          MetaReviewGateRoute,
          "human_gate_threshold_not_met" | "human_gate_threshold_unresolved"
        >;
        recommendation?: MetaReviewRecommendation;
        thresholdMetadata?: MetaReviewGateThresholdMetadata;
      }
  );

export async function appendHumanGateApprovalRequest(
  input: AppendHumanGateApprovalRequestInput
): Promise<AppendProtocolEnvelopeResult> {
  if (
    input.route === "human_gate_threshold_not_met"
    || input.route === "human_gate_threshold_unresolved"
  ) {
    return appendHumanApprovalRequestEnvelope({
      appendEnvelope: input.appendEnvelope,
      transcriptPath: input.transcriptPath,
      inboxPath: input.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      bubbleId: input.bubbleId,
      round: input.round,
      summary: input.summary,
      route: input.route,
      refs: input.refs,
      metaReviewerAgent: input.metaReviewerAgent,
      recommendation: input.recommendation,
      parityMetadata: input.parityMetadata,
      thresholdMetadata: input.thresholdMetadata,
      ...(input.consecutiveCleanRuns !== undefined
        ? { consecutiveCleanRuns: input.consecutiveCleanRuns }
        : {}),
      ...(input.gateReasonCode !== undefined
        ? { gateReasonCode: input.gateReasonCode }
        : {}),
      ...(input.findings !== undefined ? { findings: input.findings } : {})
    });
  }

  return appendHumanApprovalRequestEnvelope({
    appendEnvelope: input.appendEnvelope,
    transcriptPath: input.transcriptPath,
    inboxPath: input.inboxPath,
    lockPath: input.lockPath,
    now: input.now,
    bubbleId: input.bubbleId,
    round: input.round,
    summary: input.summary,
    route: input.route,
    refs: input.refs,
    metaReviewerAgent: input.metaReviewerAgent,
    ...(input.recommendation !== undefined
      ? { recommendation: input.recommendation }
      : {}),
    parityMetadata: input.parityMetadata,
    ...(input.consecutiveCleanRuns !== undefined
      ? { consecutiveCleanRuns: input.consecutiveCleanRuns }
      : {}),
    ...(input.gateReasonCode !== undefined
      ? { gateReasonCode: input.gateReasonCode }
      : {}),
    ...(input.findings !== undefined ? { findings: input.findings } : {})
  });
}

export async function resolveRollbackAfterGateAppendFailure(
  input: ResolveRollbackAfterGateAppendFailureInput
): Promise<ResolveRollbackAfterGateAppendFailureResult> {
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
    if (isNamedError(rollbackError, "StateStoreConflictError")) {
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
