import { join } from "node:path";

import { appendProtocolEnvelope, type AppendProtocolEnvelopeResult } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../runtime/sessionsRegistry.js";
import { runTmux } from "../runtime/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "../runtime/tmuxInput.js";
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState,
  type BubbleStateSnapshot,
  type AgentName,
  type MetaReviewRecommendation,
  type MetaReviewRunStatus
} from "../../types/bubble.js";
import {
  MetaReviewError,
  hasCanonicalSubmitForActiveMetaReviewRound,
  type MetaReviewRunResult
} from "./metaReview.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export type MetaReviewGateRoute =
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_approve"
  | "human_gate_budget_exhausted"
  | "human_gate_inconclusive"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed";

export type MetaReviewGateReasonCode =
  | "META_REVIEW_GATE_RUN_FAILED"
  | "META_REVIEW_GATE_REWORK_DISPATCH_FAILED"
  | "META_REVIEW_GATE_STATE_CONFLICT"
  | "META_REVIEW_GATE_TRANSITION_INVALID";

export interface ApplyMetaReviewGateOnConvergenceInput {
  bubbleId: string;
  summary: string;
  refs?: string[];
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export interface ApplyMetaReviewGateOnConvergenceDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  setMetaReviewerPaneBinding?: typeof setMetaReviewerPaneBinding;
  notifyMetaReviewerSubmissionRequest?: typeof notifyMetaReviewerSubmissionRequest;
  runTmux?: typeof runTmux;
}

export interface RecoverMetaReviewGateFromSnapshotInput {
  bubbleId: string;
  refs?: string[];
  summary?: string;
  repoPath?: string;
  cwd?: string;
  now?: Date;
  runResult?: MetaReviewRunResult;
}

export interface RecoverMetaReviewGateFromSnapshotDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  setMetaReviewerPaneBinding?: typeof setMetaReviewerPaneBinding;
}

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  metaReviewRun?: MetaReviewRunResult;
}

export class MetaReviewGateError extends Error {
  public readonly reasonCode: MetaReviewGateReasonCode;

  public constructor(reasonCode: MetaReviewGateReasonCode, message: string) {
    super(message);
    this.name = "MetaReviewGateError";
    this.reasonCode = reasonCode;
  }
}

const metaReviewFallbackReportRef = "artifacts/meta-review-last.md";
const metaReviewerAgent: AgentName = "codex";

function normalizeMetaReviewSnapshot(
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

export interface NotifyMetaReviewerSubmissionRequestInput {
  bubbleId: string;
  round: number;
  targetPane: string;
}

export interface NotifyMetaReviewerSubmissionRequestDependencies {
  runTmux?: typeof runTmux;
}

export async function notifyMetaReviewerSubmissionRequest(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<void> {
  const runner = dependencies.runTmux ?? runTmux;
  const message = [
    `# [pairflow] bubble=${input.bubbleId} meta-review request round=${input.round}.`,
    "Perform autonomous meta-review now, then submit through structured Pairflow CLI (no pane markers).",
    `Required command: pairflow bubble meta-review submit --id ${input.bubbleId} --round ${input.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"key":"value"}'].`
  ].join(" ");

  await maybeAcceptClaudeTrustPrompt(runner, input.targetPane).catch(() => undefined);
  await sendAndSubmitTmuxPaneMessage(runner, input.targetPane, message);
}

function toConflictError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${reason}`
  );
}

function toTransitionError(error: unknown): MetaReviewGateError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${reason}`
  );
}

function assertRunningConvergenceState(state: BubbleStateSnapshot): void {
  if (state.state !== "RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate convergence route requires RUNNING state (current: ${state.state}).`
    );
  }
}

function buildGateLockPath(paths: { locksDir: string; bubbleId: string }): string {
  return join(paths.locksDir, `${paths.bubbleId}.lock`);
}

function buildHumanGateSummary(input: {
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

async function appendHumanApprovalRequest(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  summary: string;
  refs: string[];
  recommendation?: MetaReviewRecommendation;
}): Promise<AppendProtocolEnvelopeResult> {
  return input.appendEnvelope({
    transcriptPath: input.transcriptPath,
    mirrorPaths: [input.inboxPath],
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "APPROVAL_REQUEST",
      round: input.round,
      payload: {
        summary: input.summary,
        metadata: {
          actor: "meta-reviewer",
          actor_agent: "codex",
          ...(input.recommendation !== undefined
            ? { latest_recommendation: input.recommendation }
            : {})
        }
      },
      refs: input.refs
    }
  });
}

function transitionToGateState(input: {
  current: BubbleStateSnapshot;
  nowIso: string;
  targetState:
    | "READY_FOR_HUMAN_APPROVAL"
    | "READY_FOR_APPROVAL"
    | "META_REVIEW_FAILED";
  stickyHumanGate: boolean;
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
  const shouldHydrateFallbackRecommendation =
    input.fallbackRecommendation !== undefined;
  const fallbackRecommendation = input.fallbackRecommendation;
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
      ...(shouldHydrateFallbackRecommendation
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

function incrementAutoReworkCount(input: BubbleStateSnapshot): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      auto_rework_count: metaReview.auto_rework_count + 1
    }
  };
}

function resolveHumanGateRoute(
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
        "META_REVIEW_GATE_TRANSITION_INVALID: human gate route resolver reached rework+budgetAvailable branch unexpectedly."
      );
    }
    return "human_gate_budget_exhausted";
  }
  return "human_gate_inconclusive";
}

function synthesizeMetaReviewRunResultFromSnapshot(input: {
  bubbleId: string;
  nowIso: string;
  snapshot: BubbleMetaReviewSnapshotState;
  fallbackSummary: string;
}): MetaReviewRunResult {
  const recommendation = input.snapshot.last_autonomous_recommendation ?? "inconclusive";
  const status: MetaReviewRunStatus =
    input.snapshot.last_autonomous_status ?? "error";
  const summary = input.snapshot.last_autonomous_summary ?? input.fallbackSummary;
  const reportRef =
    input.snapshot.last_autonomous_report_ref ?? metaReviewFallbackReportRef;
  const runId =
    input.snapshot.last_autonomous_run_id === null
      ? undefined
      : input.snapshot.last_autonomous_run_id;
  const updatedAt = input.snapshot.last_autonomous_updated_at ?? input.nowIso;
  const reworkTargetMessage = recommendation === "rework"
    ? (input.snapshot.last_autonomous_rework_target_message ?? null)
    : null;

  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status,
    recommendation,
    summary,
    report_ref: reportRef,
    rework_target_message: reworkTargetMessage,
    updated_at: updatedAt,
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    ...(runId !== undefined ? { run_id: runId } : {})
  };
}

function synthesizeMetaReviewRunFailure(input: {
  bubbleId: string;
  nowIso: string;
  fallbackSummary: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "error",
    recommendation: "inconclusive",
    summary: input.fallbackSummary,
    report_ref: metaReviewFallbackReportRef,
    rework_target_message: null,
    updated_at: input.nowIso,
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: []
  };
}

async function persistHumanGateRoute(input: {
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
  fallbackRecommendation?: MetaReviewRecommendation;
  targetState?:
    | "READY_FOR_HUMAN_APPROVAL"
    | "READY_FOR_APPROVAL"
    | "META_REVIEW_FAILED";
  stickyHumanGate?: boolean;
}): Promise<MetaReviewGateResult> {
  const targetState = input.targetState ?? "READY_FOR_HUMAN_APPROVAL";
  const stickyHumanGate = input.stickyHumanGate ?? (
    input.route === "human_gate_dispatch_failed" || input.route === "human_gate_run_failed"
      ? false
      : true
  );
  const nextState = transitionToGateState({
    current: input.loaded.state,
    nowIso: input.nowIso,
    targetState,
    stickyHumanGate,
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
    gateAppended = await appendHumanApprovalRequest({
      appendEnvelope: input.appendEnvelope,
      transcriptPath: input.transcriptPath,
      inboxPath: input.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      bubbleId: input.bubbleId,
      round: input.loaded.state.round,
      summary: input.summary,
      refs: input.refs,
      ...(input.metaReviewRun !== undefined
        ? { recommendation: input.metaReviewRun.recommendation }
        : input.fallbackRecommendation !== undefined
          ? { recommendation: input.fallbackRecommendation }
          : {})
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    let rollbackContext = "rollback_outcome=not_attempted";
    let rollbackReasonCode: MetaReviewGateReasonCode = "META_REVIEW_GATE_TRANSITION_INVALID";
    try {
      await input.writeState(input.statePath, input.loaded.state, {
        expectedFingerprint: written.fingerprint,
        expectedState: targetState
      });
      rollbackContext = "rollback_outcome=applied";
    } catch (rollbackError) {
      if (rollbackError instanceof StateStoreConflictError) {
        rollbackReasonCode = "META_REVIEW_GATE_STATE_CONFLICT";
      }
      const rollbackReason = rollbackError instanceof Error
        ? rollbackError.message
        : String(rollbackError);
      rollbackContext = `rollback_outcome=failed rollback_error=${rollbackReason}`;
    }
    throw new MetaReviewGateError(
      rollbackReasonCode,
      `${rollbackReasonCode}: state transitioned to ${targetState} but approval request append failed (${rollbackContext}). Root error: ${reason}`
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

export async function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = input.refs ?? [];

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const lockPath = buildGateLockPath({
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });
  const deactivateMetaReviewerPane = async (): Promise<void> => {
    await setMetaReviewerPane({
      sessionsPath: resolved.bubblePaths.sessionsPath,
      bubbleId: resolved.bubbleId,
      active: false,
      now
    }).catch(() => undefined);
  };
  const finishWithPaneDeactivation = async (
    result: MetaReviewGateResult
  ): Promise<MetaReviewGateResult> => {
    await deactivateMetaReviewerPane();
    return result;
  };

  const loaded = await readState(resolved.bubblePaths.statePath);
  if (loaded.state.state !== "META_REVIEW_RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `meta-review gate recovery requires META_REVIEW_RUNNING state (current: ${loaded.state.state}).`
    );
  }

  const snapshot = normalizeMetaReviewSnapshot(loaded.state.meta_review);
  const fallbackSummary =
    input.summary ??
    "Meta-review completed previously; recovering gate route from snapshot.";
  const snapshotHasCanonicalSubmitInActiveWindow =
    hasCanonicalSubmitForActiveMetaReviewRound({
      state: loaded.state,
      snapshot
    });
  const runResult = input.runResult ?? (
    snapshotHasCanonicalSubmitInActiveWindow
      ? synthesizeMetaReviewRunResultFromSnapshot({
          bubbleId: resolved.bubbleId,
          nowIso,
          snapshot,
          fallbackSummary
        })
      : synthesizeMetaReviewRunFailure({
          bubbleId: resolved.bubbleId,
          nowIso,
          fallbackSummary
        })
  );
  const summary = runResult.summary
    ?? input.summary
    ?? "Meta-review completed previously; recovering gate route from snapshot.";

  const snapshotHasRunIdentity = snapshotHasCanonicalSubmitInActiveWindow;
  const snapshotUpdatedAtMs = Date.parse(snapshot.last_autonomous_updated_at ?? "");
  const runResultUpdatedAtMs = Date.parse(input.runResult?.updated_at ?? "");
  const hasComparableTimestamps =
    Number.isFinite(snapshotUpdatedAtMs) && Number.isFinite(runResultUpdatedAtMs);
  const updatedAtChanged = input.runResult === undefined
    ? false
    : (hasComparableTimestamps
        ? snapshotUpdatedAtMs !== runResultUpdatedAtMs
        : snapshot.last_autonomous_updated_at !== input.runResult.updated_at);
  if (
    input.runResult !== undefined
    && snapshotHasRunIdentity
    && updatedAtChanged
  ) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: canonical snapshot changed between await and recovery route."
    );
  }

  if (runResult.status === "error") {
    return finishWithPaneDeactivation(
      await persistHumanGateRoute({
        appendEnvelope,
        writeState,
        statePath: resolved.bubblePaths.statePath,
        transcriptPath: resolved.bubblePaths.transcriptPath,
        inboxPath: resolved.bubblePaths.inboxPath,
        lockPath,
        now,
        nowIso,
        bubbleId: resolved.bubbleId,
        summary: buildHumanGateSummary({
          convergenceSummary: summary,
          metaReviewRun: runResult
        }),
        refs,
        loaded,
        expectedState: "META_REVIEW_RUNNING",
        route: "human_gate_run_failed",
        metaReviewRun: runResult,
        targetState: "META_REVIEW_FAILED",
        stickyHumanGate: false
      })
    );
  }

  const recommendation = runResult.recommendation;
  const budgetAvailable =
    snapshot.auto_rework_count < snapshot.auto_rework_limit;

  if (recommendation === "rework" && budgetAvailable) {
    if (snapshot.sticky_human_gate) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        "META_REVIEW_GATE_STATE_CONFLICT: sticky_human_gate became true before auto rework dispatch."
      );
    }

    const reworkMessage = runResult.rework_target_message;
    if (reworkMessage === null || reworkMessage.trim().length === 0) {
      return finishWithPaneDeactivation(
        await persistHumanGateRoute({
          appendEnvelope,
          writeState,
          statePath: resolved.bubblePaths.statePath,
          transcriptPath: resolved.bubblePaths.transcriptPath,
          inboxPath: resolved.bubblePaths.inboxPath,
          lockPath,
          now,
          nowIso,
          bubbleId: resolved.bubbleId,
          summary: buildHumanGateSummary({
            convergenceSummary: summary,
            fallbackReason:
              "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch"
          }),
          refs,
          loaded,
          expectedState: "META_REVIEW_RUNNING",
          route: "human_gate_dispatch_failed",
          metaReviewRun: runResult
        })
      );
    }

    let resumedWritten: LoadedStateSnapshot;
    try {
      const nextRound = loaded.state.round + 1;
      const resumed = applyStateTransition(loaded.state, {
        to: "RUNNING",
        round: nextRound,
        activeAgent: resolved.bubbleConfig.agents.implementer,
        activeRole: "implementer",
        activeSince: nowIso,
        lastCommandAt: nowIso,
        appendRoundRoleEntry: {
          round: nextRound,
          implementer: resolved.bubbleConfig.agents.implementer,
          reviewer: resolved.bubbleConfig.agents.reviewer,
          switched_at: nowIso
        }
      });
      resumedWritten = await writeState(resolved.bubblePaths.statePath, resumed, {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "META_REVIEW_RUNNING"
      });
    } catch (error) {
      if (error instanceof StateStoreConflictError) {
        throw toConflictError(error);
      }
      throw toTransitionError(error);
    }

    let dispatched: AppendProtocolEnvelopeResult;
    try {
      dispatched = await appendEnvelope({
        transcriptPath: resolved.bubblePaths.transcriptPath,
        mirrorPaths: [resolved.bubblePaths.inboxPath],
        lockPath,
        now,
        envelope: {
          bubble_id: resolved.bubbleId,
          sender: "orchestrator",
          recipient: resolved.bubbleConfig.agents.implementer,
          type: "APPROVAL_DECISION",
          round: loaded.state.round,
          payload: {
            decision: "revise",
            message: reworkMessage,
            metadata: {
              actor: "meta-reviewer",
              actor_agent: "codex",
              recommendation: runResult.recommendation,
              ...(runResult.run_id !== undefined
                ? { run_id: runResult.run_id }
                : {})
            }
          },
          refs
        }
      });
    } catch (error) {
      const appendReason = error instanceof Error ? error.message : String(error);

      let readyForApproval: LoadedStateSnapshot;
      let restoreOutcome = "restore_outcome=not_attempted";
      try {
        const backToReady = applyStateTransition(resumedWritten.state, {
          to: "READY_FOR_APPROVAL",
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: nowIso
        });
        const restoredCounterReady: BubbleStateSnapshot = {
          ...backToReady,
          round: loaded.state.round,
          round_role_history: loaded.state.round_role_history,
          meta_review: snapshot
        };
        readyForApproval = await writeState(
          resolved.bubblePaths.statePath,
          restoredCounterReady,
          {
            expectedFingerprint: resumedWritten.fingerprint,
            expectedState: "RUNNING"
          }
        );
        restoreOutcome = "restore_outcome=applied";
      } catch (recoveryError) {
        const restoreReason =
          recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
        restoreOutcome = `restore_outcome=failed restore_error=${restoreReason}`;
        if (recoveryError instanceof StateStoreConflictError) {
          throw new MetaReviewGateError(
            "META_REVIEW_GATE_STATE_CONFLICT",
            `META_REVIEW_GATE_STATE_CONFLICT: auto-rework dispatch append failed (append_error=${appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`
          );
        }
        throw new MetaReviewGateError(
          "META_REVIEW_GATE_TRANSITION_INVALID",
          `META_REVIEW_GATE_TRANSITION_INVALID: auto-rework dispatch append failed (append_error=${appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`
        );
      }

      return finishWithPaneDeactivation(
        await persistHumanGateRoute({
          appendEnvelope,
          writeState,
          statePath: resolved.bubblePaths.statePath,
          transcriptPath: resolved.bubblePaths.transcriptPath,
          inboxPath: resolved.bubblePaths.inboxPath,
          lockPath,
          now,
          nowIso,
          bubbleId: resolved.bubbleId,
          summary: buildHumanGateSummary({
            convergenceSummary: summary,
            fallbackReason:
              `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}; ${restoreOutcome}`
          }),
          refs,
          loaded: readyForApproval,
          expectedState: "READY_FOR_APPROVAL",
          route: "human_gate_dispatch_failed",
          metaReviewRun: runResult
        })
      );
    }

    let written: LoadedStateSnapshot | undefined;
    try {
      const resumedWithCounter = incrementAutoReworkCount(resumedWritten.state);
      written = await writeState(
        resolved.bubblePaths.statePath,
        resumedWithCounter,
        {
          expectedFingerprint: resumedWritten.fingerprint,
          expectedState: "RUNNING"
        }
      );
    } catch (error) {
      if (error instanceof StateStoreConflictError) {
        const expectedCount = snapshot.auto_rework_count;
        const targetCount = expectedCount + 1;
        let latestConflict: StateStoreConflictError = error;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const latest = await readState(resolved.bubblePaths.statePath);
          if (latest.state.state !== "RUNNING") {
            throw toConflictError(latestConflict);
          }

          const latestMetaReview = normalizeMetaReviewSnapshot(latest.state.meta_review);
          if (latestMetaReview.auto_rework_count >= targetCount) {
            written = latest;
            break;
          }

          const latestIncremented: BubbleStateSnapshot = {
            ...latest.state,
            meta_review: {
              ...latestMetaReview,
              auto_rework_count: targetCount
            }
          };
          try {
            written = await writeState(
              resolved.bubblePaths.statePath,
              latestIncremented,
              {
                expectedFingerprint: latest.fingerprint,
                expectedState: "RUNNING"
              }
            );
            break;
          } catch (retryError) {
            if (!(retryError instanceof StateStoreConflictError)) {
              throw toTransitionError(retryError);
            }
            latestConflict = retryError;
          }
        }

        if (written === undefined) {
          throw toConflictError(latestConflict);
        }
      } else {
        throw toTransitionError(error);
      }
    }
    if (written === undefined) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        "META_REVIEW_GATE_STATE_CONFLICT: auto-rework count update did not converge after dispatch."
      );
    }

    return finishWithPaneDeactivation({
      bubbleId: resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: written.state,
      metaReviewRun: runResult
    });
  }

  return finishWithPaneDeactivation(
    await persistHumanGateRoute({
      appendEnvelope,
      writeState,
      statePath: resolved.bubblePaths.statePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      inboxPath: resolved.bubblePaths.inboxPath,
      lockPath,
      now,
      nowIso,
      bubbleId: resolved.bubbleId,
      summary: buildHumanGateSummary({
        convergenceSummary: summary,
        metaReviewRun: runResult
      }),
      refs,
      loaded,
      expectedState: "META_REVIEW_RUNNING",
      route: resolveHumanGateRoute(recommendation, budgetAvailable),
      metaReviewRun: runResult
    })
  );
}

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const notifySubmissionRequest =
    dependencies.notifyMetaReviewerSubmissionRequest ?? notifyMetaReviewerSubmissionRequest;
  const runTmuxRunner = dependencies.runTmux ?? runTmux;
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = input.refs ?? [];

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const lockPath = buildGateLockPath({
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });
  const loadedRunning = await readState(resolved.bubblePaths.statePath);
  assertRunningConvergenceState(loadedRunning.state);

  let readyForApproval: LoadedStateSnapshot;
  try {
    const nextReadyForApproval = applyStateTransition(loadedRunning.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: nowIso
    });
    readyForApproval = await writeState(
      resolved.bubblePaths.statePath,
      nextReadyForApproval,
      {
        expectedFingerprint: loadedRunning.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  }

  const readyMetaReview = normalizeMetaReviewSnapshot(
    readyForApproval.state.meta_review
  );

  if (readyMetaReview.sticky_human_gate) {
    return persistHumanGateRoute({
      appendEnvelope,
      writeState,
      statePath: resolved.bubblePaths.statePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      inboxPath: resolved.bubblePaths.inboxPath,
      lockPath,
      now,
      nowIso,
      bubbleId: resolved.bubbleId,
      summary: input.summary,
      refs,
      loaded: readyForApproval,
      expectedState: "READY_FOR_APPROVAL",
      route: "human_gate_sticky_bypass"
    });
  }

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    const nextMetaReviewRunning = applyStateTransition(readyForApproval.state, {
      to: "META_REVIEW_RUNNING",
      activeAgent: metaReviewerAgent,
      activeRole: "meta_reviewer",
      activeSince: nowIso,
      lastCommandAt: nowIso
    });
    metaReviewRunningState = await writeState(
      resolved.bubblePaths.statePath,
      nextMetaReviewRunning,
      {
        expectedFingerprint: readyForApproval.fingerprint,
        expectedState: "READY_FOR_APPROVAL"
      }
    );
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  }

  let metaReviewerPaneWarning: string | null = null;
  const bindStart = await setMetaReviewerPane({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId,
    active: true,
    now
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      updated: false,
      reason: "no_runtime_session" as const,
      errorMessage: reason
    };
  });
  if (!bindStart.updated) {
    const bindReason = "errorMessage" in bindStart
      ? bindStart.errorMessage
      : bindStart.reason ?? "unknown";
    metaReviewerPaneWarning = `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`;
  } else if ("record" in bindStart && bindStart.record !== undefined) {
    const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
    const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
    await notifySubmissionRequest(
      {
        bubbleId: resolved.bubbleId,
        round: metaReviewRunningState.state.round,
        targetPane
      },
      {
        runTmux: runTmuxRunner
      }
    ).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      metaReviewerPaneWarning = `META_REVIEWER_PANE_UNAVAILABLE: ${reason}`;
    });
  }

  if (metaReviewerPaneWarning !== null) {
    return persistHumanGateRoute({
      appendEnvelope,
      writeState,
      statePath: resolved.bubblePaths.statePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      inboxPath: resolved.bubblePaths.inboxPath,
      lockPath,
      now,
      nowIso,
      bubbleId: resolved.bubbleId,
      summary: buildHumanGateSummary({
        convergenceSummary: input.summary,
        fallbackReason:
          `META_REVIEW_GATE_RUN_FAILED: structured submit request unavailable (${metaReviewerPaneWarning}).`
      }),
      refs,
      loaded: metaReviewRunningState,
      expectedState: "META_REVIEW_RUNNING",
      route: "human_gate_run_failed",
      fallbackRecommendation: "inconclusive",
      targetState: "META_REVIEW_FAILED",
      stickyHumanGate: false
    });
  }

  try {
    const kickoffSummary = [
      `Meta-review gate opened for bubble ${resolved.bubbleId} round ${metaReviewRunningState.state.round}.`,
      "Submit result through structured CLI:",
      `pairflow bubble meta-review submit --id ${resolved.bubbleId} --round ${metaReviewRunningState.state.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"key":"value"}'].`
    ].join(" ");

    const appended = await appendEnvelope({
      transcriptPath: resolved.bubblePaths.transcriptPath,
      mirrorPaths: [resolved.bubblePaths.inboxPath],
      lockPath,
      now,
      envelope: {
        bubble_id: resolved.bubbleId,
        sender: "orchestrator",
        recipient: metaReviewerAgent,
        type: "TASK",
        round: metaReviewRunningState.state.round,
        payload: {
          summary: kickoffSummary,
          metadata: {
            actor: "meta-review-gate",
            actor_agent: "orchestrator",
            lifecycle_state: "META_REVIEW_RUNNING",
            ...(metaReviewerPaneWarning !== null
              ? { pane_warning: metaReviewerPaneWarning }
              : {})
          }
        },
        refs
      }
    });

    return {
      bubbleId: resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: metaReviewRunningState.state
    };
  } catch (error) {
    const runFailureReason = error instanceof Error ? error.message : String(error);
    const fallbackSummary = buildHumanGateSummary({
      convergenceSummary: input.summary,
      fallbackReason: `META_REVIEW_GATE_RUN_FAILED: ${runFailureReason}`
    });
    return persistHumanGateRoute({
      appendEnvelope,
      writeState,
      statePath: resolved.bubblePaths.statePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      inboxPath: resolved.bubblePaths.inboxPath,
      lockPath,
      now,
      nowIso,
      bubbleId: resolved.bubbleId,
      summary: fallbackSummary,
      refs,
      loaded: metaReviewRunningState,
      expectedState: "META_REVIEW_RUNNING",
      route: "human_gate_run_failed",
      fallbackRecommendation: "inconclusive",
      targetState: "META_REVIEW_FAILED",
      stickyHumanGate: false
    });
  }
}

export function toMetaReviewGateError(error: unknown): MetaReviewGateError {
  if (error instanceof MetaReviewGateError) {
    return error;
  }
  if (error instanceof StateStoreConflictError) {
    return toConflictError(error);
  }
  if (error instanceof BubbleLookupError) {
    return new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      error.message
    );
  }
  if (error instanceof MetaReviewError) {
    return new MetaReviewGateError(
      "META_REVIEW_GATE_RUN_FAILED",
      `${error.reasonCode}: ${error.message}`
    );
  }
  if (error instanceof Error) {
    return new MetaReviewGateError("META_REVIEW_GATE_TRANSITION_INVALID", error.message);
  }
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `Unknown meta-review gate error: ${String(error)}`
  );
}

export function asMetaReviewGateError(error: unknown): never {
  throw toMetaReviewGateError(error);
}
