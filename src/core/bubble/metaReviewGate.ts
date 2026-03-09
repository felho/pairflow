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
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  type BubbleMetaReviewSnapshotState,
  type BubbleStateSnapshot,
  type MetaReviewRecommendation
} from "../../types/bubble.js";
import {
  MetaReviewError,
  runMetaReview,
  type MetaReviewDependencies,
  type MetaReviewRunResult
} from "./metaReview.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export type MetaReviewGateRoute =
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
  runMetaReview?: typeof runMetaReview;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  setMetaReviewerPaneBinding?: typeof setMetaReviewerPaneBinding;
  metaReviewDependencies?: MetaReviewDependencies;
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
  targetState: "READY_FOR_HUMAN_APPROVAL" | "READY_FOR_APPROVAL";
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
  const fallbackRunId = `run_meta_gate_fallback_${input.nowIso.replace(
    /[-:.TZ]/gu,
    ""
  )}`;
  return {
    ...transitioned,
    meta_review: {
      ...metaReview,
      ...(shouldHydrateFallbackRecommendation
        ? {
            last_autonomous_run_id: fallbackRunId,
            last_autonomous_status:
              "error",
            last_autonomous_recommendation: input.fallbackRecommendation,
            last_autonomous_summary:
              input.fallbackSummary ??
              `Meta-review gate fallback recommendation: ${input.fallbackRecommendation}.`,
            last_autonomous_report_ref: metaReviewFallbackReportRef,
            last_autonomous_rework_target_message: null,
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
): Exclude<MetaReviewGateRoute, "auto_rework" | "human_gate_sticky_bypass" | "human_gate_run_failed" | "human_gate_dispatch_failed"> {
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
  targetState?: "READY_FOR_HUMAN_APPROVAL" | "READY_FOR_APPROVAL";
  stickyHumanGate?: boolean;
}): Promise<MetaReviewGateResult> {
  const targetState = input.targetState ?? "READY_FOR_HUMAN_APPROVAL";
  const stickyHumanGate = input.stickyHumanGate ?? true;
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
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: state transitioned to ${targetState} but approval request append failed. Root error: ${reason}`
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

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const runReview = dependencies.runMetaReview ?? runMetaReview;
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
      activeAgent: null,
      activeRole: null,
      activeSince: null,
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
  }

  let runResult: MetaReviewRunResult | undefined;
  let runFailureReason: string | null = null;
  try {
    runResult = await runReview(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath,
        cwd: resolved.bubblePaths.worktreePath
      },
      {
        ...(dependencies.metaReviewDependencies ?? {}),
        now
      }
    );
  } catch (error) {
    runFailureReason = error instanceof Error ? error.message : String(error);
  } finally {
    const bindStop = await setMetaReviewerPane({
      sessionsPath: resolved.bubblePaths.sessionsPath,
      bubbleId: resolved.bubbleId,
      active: false,
      ...(runResult?.run_id !== undefined ? { runId: runResult.run_id } : {}),
      now
    }).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        updated: false,
        reason: "no_runtime_session" as const,
        errorMessage: reason
      };
    });
    if (!bindStop.updated && metaReviewerPaneWarning === null) {
      const bindReason = "errorMessage" in bindStop
        ? bindStop.errorMessage
        : bindStop.reason ?? "unknown";
      metaReviewerPaneWarning = `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`;
    }
  }

  if (runResult === undefined) {
    const warningSuffix =
      metaReviewerPaneWarning === null ? "" : `; ${metaReviewerPaneWarning}`;
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
        fallbackReason: `META_REVIEW_GATE_RUN_FAILED: ${runFailureReason ?? "unknown"}${warningSuffix}`
      }),
      refs,
      loaded: metaReviewRunningState,
      expectedState: "META_REVIEW_RUNNING",
      route: "human_gate_run_failed",
      fallbackRecommendation: "inconclusive",
      targetState: "READY_FOR_APPROVAL",
      stickyHumanGate: false
    });
  }

  if (metaReviewerPaneWarning !== null) {
    runResult.warnings.push({
      reason_code: "META_REVIEWER_PANE_UNAVAILABLE",
      message: metaReviewerPaneWarning
    });
  }

  const afterRun = await readState(resolved.bubblePaths.statePath);
  if (afterRun.state.state !== "META_REVIEW_RUNNING") {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: meta-review run must preserve META_REVIEW_RUNNING lifecycle (found ${afterRun.state.state}).`
    );
  }

  const afterRunMetaReview = normalizeMetaReviewSnapshot(afterRun.state.meta_review);
  if (runResult.status === "error") {
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
        metaReviewRun: runResult
      }),
      refs,
      loaded: afterRun,
      expectedState: "META_REVIEW_RUNNING",
      route: "human_gate_run_failed",
      metaReviewRun: runResult,
      targetState: "READY_FOR_APPROVAL",
      stickyHumanGate: false
    });
  }

  const recommendation = runResult.recommendation;
  const budgetAvailable =
    afterRunMetaReview.auto_rework_count < afterRunMetaReview.auto_rework_limit;

  if (recommendation === "rework" && budgetAvailable) {
    if (afterRunMetaReview.sticky_human_gate) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        "META_REVIEW_GATE_STATE_CONFLICT: sticky_human_gate became true before auto rework dispatch."
      );
    }

    const reworkMessage = runResult.rework_target_message;
    if (reworkMessage === null || reworkMessage.trim().length === 0) {
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
            "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch"
        }),
        refs,
        loaded: afterRun,
        expectedState: "META_REVIEW_RUNNING",
        route: "human_gate_dispatch_failed",
        metaReviewRun: runResult
      });
    }

    let resumedWritten: LoadedStateSnapshot;
    try {
      const nextRound = afterRun.state.round + 1;
      const resumed = applyStateTransition(afterRun.state, {
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
        expectedFingerprint: afterRun.fingerprint,
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
          round: afterRun.state.round,
          payload: {
            decision: "revise",
            message: reworkMessage,
            metadata: {
              actor: "meta-reviewer",
              recommendation: runResult.recommendation,
              run_id: runResult.run_id
            }
          },
          refs
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      let readyForApproval: LoadedStateSnapshot;
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
          round: afterRun.state.round,
          round_role_history: afterRun.state.round_role_history,
          meta_review: afterRunMetaReview
        };
        readyForApproval = await writeState(
          resolved.bubblePaths.statePath,
          restoredCounterReady,
          {
            expectedFingerprint: resumedWritten.fingerprint,
            expectedState: "RUNNING"
          }
        );
      } catch (recoveryError) {
        if (recoveryError instanceof StateStoreConflictError) {
          throw toConflictError(recoveryError);
        }
        throw toTransitionError(recoveryError);
      }

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
          fallbackReason: `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${reason}`
        }),
        refs,
        loaded: readyForApproval,
        expectedState: "READY_FOR_APPROVAL",
        route: "human_gate_dispatch_failed",
        metaReviewRun: runResult
      });
    }

    let written: LoadedStateSnapshot;
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
        const latest = await readState(resolved.bubblePaths.statePath);
        if (latest.state.state !== "RUNNING") {
          throw toConflictError(error);
        }

        const latestMetaReview = normalizeMetaReviewSnapshot(latest.state.meta_review);
        const expectedCount = afterRunMetaReview.auto_rework_count;
        const targetCount = expectedCount + 1;

        if (latestMetaReview.auto_rework_count === targetCount) {
          written = latest;
        } else if (latestMetaReview.auto_rework_count === expectedCount) {
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
          } catch (retryError) {
            if (retryError instanceof StateStoreConflictError) {
              throw toConflictError(retryError);
            }
            throw toTransitionError(retryError);
          }
        } else {
          throw toConflictError(error);
        }
      } else {
        throw toTransitionError(error);
      }
    }

    return {
      bubbleId: resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: written.state,
      metaReviewRun: runResult
    };
  }

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
      metaReviewRun: runResult
    }),
    refs,
    loaded: afterRun,
    expectedState: "META_REVIEW_RUNNING",
    route: resolveHumanGateRoute(recommendation, budgetAvailable),
    metaReviewRun: runResult
  });
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
