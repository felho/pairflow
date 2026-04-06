import { appendHumanApprovalRequestEnvelope } from "../../../core/bubble/approvalRequestEnvelope.js";
import {
  StateStoreConflictError,
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
} from "../../../core/protocol/transcriptStore.js";
import type { MetaReviewGateRoute } from "./metaReviewGateTypes.js";
import type { MetaReviewGateAdvisoryFinding } from "./metaReviewGateFindingsMetadata.js";

export const metaReviewGateRollbackNotAttemptedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_NOT_ATTEMPTED";
export const metaReviewGateRollbackAppliedReasonCode =
  "META_REVIEW_GATE_ROLLBACK_APPLIED";
export const metaReviewGateRollbackStateConflictReasonCode =
  "META_REVIEW_GATE_ROLLBACK_STATE_CONFLICT";
export const metaReviewGateRollbackTransitionInvalidReasonCode =
  "META_REVIEW_GATE_ROLLBACK_TRANSITION_INVALID";

export interface ResolveRollbackAfterGateAppendFailureInput {
  writeState: typeof writeStateSnapshot;
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

export function resolveHumanGateRecommendation(input: {
  metaReviewRun?: MetaReviewResult;
  fallbackRecommendation?: MetaReviewRecommendation;
}): MetaReviewRecommendation | undefined {
  if (input.metaReviewRun !== undefined) {
    return input.metaReviewRun.recommendation;
  }
  return input.fallbackRecommendation;
}

export interface AppendHumanGateApprovalRequestInput {
  appendEnvelope: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  summary: string;
  route: MetaReviewGateRoute;
  refs: string[];
  recommendation?: MetaReviewRecommendation;
  parityMetadata?: FindingsParityMetadata | null;
  findings?: MetaReviewGateAdvisoryFinding[];
}

export async function appendHumanGateApprovalRequest(
  input: AppendHumanGateApprovalRequestInput
): Promise<AppendProtocolEnvelopeResult> {
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
    ...(input.recommendation !== undefined
      ? { recommendation: input.recommendation }
      : {}),
    parityMetadata: input.parityMetadata,
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
