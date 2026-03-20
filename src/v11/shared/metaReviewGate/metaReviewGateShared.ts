import { join } from "node:path";

import { appendHumanApprovalRequestEnvelope } from "../../../core/bubble/approvalRequestEnvelope.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState,
  type BubbleStateSnapshot,
  type MetaReviewRecommendation,
  type MetaReviewRunStatus
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

export const metaReviewFallbackReportRef = "artifacts/meta-review-last.md";
export const metaReviewerAgent = "codex";
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
const metaReviewGateAutoReworkRetryRoundInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_INVARIANT";
const metaReviewGateAutoReworkRetryOwnershipInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_OWNERSHIP_INVARIANT";
const metaReviewGateAutoReworkRetryRoundRoleHistoryInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_ROUND_ROLE_HISTORY_INVARIANT";
export const metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode =
  "META_REVIEW_GATE_AUTO_REWORK_RETRY_RUN_IDENTITY_INVARIANT";
export const metaReviewGatePaneDeactivationUnavoidableReasonCode =
  "META_REVIEW_GATE_PANE_DEACTIVATION_UNAVOIDABLE";

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot !== undefined) {
    return snapshot;
  }

  return {
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

export function buildHumanGateSummary(input: {
  convergenceSummary: string;
  metaReviewRun?: MetaReviewRunResult;
  fallbackReason?: string;
}): string {
  if (input.fallbackReason !== undefined) {
    return input.fallbackReason;
  }
  const runSummary = input.metaReviewRun?.summary;
  if (typeof runSummary === "string" && runSummary.trim().length > 0) {
    return runSummary;
  }
  return input.convergenceSummary;
}

export function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  if (metadata === null || metadata === undefined) {
    return {};
  }
  return {
    findings_claimed_open_total: metadata.findings_claimed_open_total,
    findings_artifact_open_total: metadata.findings_artifact_open_total,
    findings_artifact_status: metadata.findings_artifact_status,
    findings_digest_sha256: metadata.findings_digest_sha256,
    meta_review_run_id: metadata.meta_review_run_id,
    findings_parity_status: metadata.findings_parity_status
  };
}

export function buildHydratedMetaReviewSnapshotFromRunResult(input: {
  metaReview: BubbleMetaReviewSnapshotState;
  runResult: MetaReviewRunResult;
}): BubbleMetaReviewSnapshotState {
  return {
    ...input.metaReview,
    last_autonomous_run_id: input.runResult.run_id ?? null,
    last_autonomous_status: input.runResult.status,
    last_autonomous_recommendation: input.runResult.recommendation,
    last_autonomous_summary: input.runResult.summary,
    last_autonomous_report_ref: input.runResult.report_ref,
    last_autonomous_rework_target_message:
      input.runResult.recommendation === "rework"
        ? (
            typeof input.runResult.rework_target_message === "string" &&
            input.runResult.rework_target_message.trim().length > 0
              ? input.runResult.rework_target_message
              : "Meta-review gate fallback rework target unavailable."
          )
        : null,
    last_autonomous_updated_at: input.runResult.updated_at
  };
}

export function transitionToGateState(input: {
  current: BubbleStateSnapshot;
  nowIso: string;
  targetState:
    | "READY_FOR_HUMAN_APPROVAL"
    | "READY_FOR_APPROVAL"
    | "META_REVIEW_FAILED";
  stickyHumanGate: boolean;
  metaReviewRun?: MetaReviewRunResult;
  fallbackRecommendation?: MetaReviewRecommendation;
  fallbackSummary?: string;
}): BubbleStateSnapshot {
  const transitioned = applyStateTransition(input.current, {
    to: input.targetState,
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });

  const metaReview = normalizeMetaReviewSnapshot(transitioned.meta_review);
  const shouldHydrateFromRunResult = input.metaReviewRun !== undefined;
  const runResult = input.metaReviewRun;
  const shouldHydrateFallbackRecommendation =
    input.fallbackRecommendation !== undefined;
  const fallbackRecommendation: MetaReviewRecommendation =
    input.fallbackRecommendation ?? "inconclusive";
  const fallbackStatus: MetaReviewRunStatus =
    fallbackRecommendation === "inconclusive" ? "error" : "success";
  const fallbackReworkTargetMessage =
    fallbackRecommendation === "rework"
      ? (
          typeof metaReview.last_autonomous_rework_target_message === "string" &&
          metaReview.last_autonomous_rework_target_message.trim().length > 0
            ? metaReview.last_autonomous_rework_target_message
            : "Meta-review gate fallback rework target unavailable."
        )
      : null;
  return {
    ...transitioned,
    meta_review: {
      ...metaReview,
      ...(shouldHydrateFromRunResult && runResult !== undefined
        ? buildHydratedMetaReviewSnapshotFromRunResult({
            metaReview,
            runResult
          })
        : shouldHydrateFallbackRecommendation
        ? {
            last_autonomous_run_id: null,
            last_autonomous_status: fallbackStatus,
            last_autonomous_recommendation: fallbackRecommendation,
            last_autonomous_summary:
              input.fallbackSummary ??
              `Meta-review gate fallback recommendation: ${fallbackRecommendation}.`,
            last_autonomous_report_ref: metaReviewFallbackReportRef,
            last_autonomous_rework_target_message: fallbackReworkTargetMessage,
            last_autonomous_updated_at: input.nowIso
          }
        : {}),
      sticky_human_gate: input.stickyHumanGate
    }
  };
}

export function incrementAutoReworkCount(input: BubbleStateSnapshot): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      auto_rework_count: metaReview.auto_rework_count + 1
    }
  };
}

export function resolveHumanGateRoute(
  recommendation: MetaReviewRecommendation,
  budgetAvailable: boolean
): Exclude<
  MetaReviewGateRoute,
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed"
> {
  if (recommendation === "approve") {
    return "human_gate_approve";
  }
  if (recommendation === "rework") {
    if (budgetAvailable) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_TRANSITION_INVALID",
        "META_REVIEW_GATE_TRANSITION_INVALID: human gate route resolver reached rework+budgetAvailable branch unexpectedly.",
        {
          stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
        }
      );
    }
    return "human_gate_budget_exhausted";
  }
  return "human_gate_inconclusive";
}

export function resolveDefaultStickyHumanGateForRoute(route: MetaReviewGateRoute): boolean {
  if (route === "human_gate_run_failed" || route === "human_gate_dispatch_failed") {
    return false;
  }
  if (route === "human_gate_approve" || route === "human_gate_inconclusive") {
    return true;
  }
  if (route === "human_gate_budget_exhausted" || route === "human_gate_sticky_bypass") {
    return true;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: sticky_human_gate default policy is undefined for route=${route}.`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

export function resolveAutoReworkRetryInvariantViolation(input: {
  latest: BubbleStateSnapshot;
  expected: BubbleStateSnapshot;
}): string | null {
  if (input.latest.round !== input.expected.round) {
    return metaReviewGateAutoReworkRetryRoundInvariantReasonCode;
  }
  if (
    input.latest.active_role !== input.expected.active_role ||
    input.latest.active_agent !== input.expected.active_agent
  ) {
    return metaReviewGateAutoReworkRetryOwnershipInvariantReasonCode;
  }
  const expectedRoundRole = input.expected.round_role_history.find(
    (entry) => entry.round === input.expected.round
  );
  const latestRoundRole = input.latest.round_role_history.find(
    (entry) => entry.round === input.latest.round
  );
  if (
    expectedRoundRole === undefined ||
    latestRoundRole === undefined ||
    latestRoundRole.implementer !== expectedRoundRole.implementer ||
    latestRoundRole.reviewer !== expectedRoundRole.reviewer
  ) {
    return metaReviewGateAutoReworkRetryRoundRoleHistoryInvariantReasonCode;
  }
  return null;
}

export function resolveCanonicalMetaReviewRunId(
  snapshot: BubbleMetaReviewSnapshotState
): string | null {
  if (
    typeof snapshot.last_autonomous_run_id === "string" &&
    snapshot.last_autonomous_run_id.trim().length > 0
  ) {
    return snapshot.last_autonomous_run_id.trim();
  }
  return null;
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
