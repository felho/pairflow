import { applyStateTransition } from "../../domain/state/machine.js";
import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";
import { assertValidBubbleStateSnapshot } from "../../shared/state/stateSchema.js";
import { clearLiveMetaReviewSnapshot } from "../metaReview/metaReviewSnapshot.js";
import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import { isNamedError } from "../errors/namedError.js";
import type {
  AgentName,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  buildHumanGateSummary,
  buildGateLockPath,
  incrementAutoReworkCount,
  normalizeMetaReviewSnapshot,
  resolveFindingsParityMetadataForEnvelope,
  resolveHumanGateRoute,
  persistHumanGateRoute
} from "./metaReviewGateShared.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult
} from "./metaReviewGateTypes.js";
import { validateStructuredMetaReviewPositiveClaim } from "./metaReviewGateFindingsValidation.js";
import { resolveFindingsParityMetadataFromReportJson } from "./metaReviewGateFindingsMetadata.js";

interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: string;
        reviewer: string;
      };
    };
    bubblePaths: {
      artifactsDir: string;
      bubbleDir: string;
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  summary: string;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewArtifactReadPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}

function mergeRunResultWithParityResolution(input: {
  runResult: MetaReviewResult;
  metadata: FindingsParityMetadata | null;
  diagnostics: string[];
}): MetaReviewResult {
  if (input.metadata === null && input.diagnostics.length === 0) {
    return input.runResult;
  }
  const reportJson = { ...(input.runResult.report_json ?? {}) };
  if (input.metadata !== null) {
    reportJson.findings_claimed_open_total = input.metadata.findings_claimed_open_total;
    reportJson.findings_artifact_open_total = input.metadata.findings_artifact_open_total;
    reportJson.findings_blocking_open_total = input.metadata.findings_blocking_open_total;
    reportJson.findings_advisory_open_total = input.metadata.findings_advisory_open_total;
    reportJson.findings_artifact_status = input.metadata.findings_artifact_status;
    reportJson.findings_digest_sha256 = input.metadata.findings_digest_sha256;
    reportJson.meta_review_run_id = input.metadata.meta_review_run_id;
    reportJson.findings_parity_status = input.metadata.findings_parity_status;
  }
  const existingDiagnostics = Array.isArray(reportJson.claim_diagnostics)
    ? reportJson.claim_diagnostics.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  if (existingDiagnostics.length > 0 || input.diagnostics.length > 0) {
    reportJson.claim_diagnostics = [...existingDiagnostics, ...input.diagnostics];
  }
  return {
    ...input.runResult,
    report_json: reportJson
  };
}

async function resolveCurrentRunParity(input: {
  resolved: FinalizeCurrentRunMetaReviewGateInput["resolved"];
  snapshot: ReturnType<typeof normalizeMetaReviewSnapshot>;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewArtifactReadPort;
}): Promise<
  | {
      ok: true;
      budgetAvailable: boolean;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
  | {
      ok: false;
      reason: string;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
> {
  const parity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    readFileFn: input.readFileFn
  });
  if (!parity.ok) {
    return {
      ok: false,
      reason: parity.reason,
      parityMetadata: parity.metadata,
      runResultForRouting: mergeRunResultWithParityResolution({
        runResult: input.runResult,
        metadata: parity.metadata,
        diagnostics: []
      })
    };
  }
  return {
    ok: true,
    budgetAvailable: input.snapshot.auto_rework_count < input.snapshot.auto_rework_limit,
    parityMetadata: parity.metadata,
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: parity.metadata,
      diagnostics: parity.diagnostics
    })
  };
}

function toGateConflictError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    }
  );
}

function toGateTransitionError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

async function persistRunFailedHumanRoute(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.appendEnvelope,
    writeState: input.writeState,
    statePath: input.resolved.bubblePaths.statePath,
    transcriptPath: input.resolved.bubblePaths.transcriptPath,
    inboxPath: input.resolved.bubblePaths.inboxPath,
    lockPath: buildGateLockPath({
      locksDir: input.resolved.bubblePaths.locksDir,
      bubbleId: input.resolved.bubbleId
    }),
    now: input.now,
    nowIso: input.now.toISOString(),
    bubbleId: input.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.summary,
      metaReviewRun: input.runResult
    }),
    refs: input.refs,
    loaded: input.loaded,
    expectedState: "RUNNING",
    route: "human_gate_run_failed",
    metaReviewRun: input.runResult,
    parityMetadata: null,
    stickyHumanGate: false
  });
}

async function persistDispatchFailedHumanRoute(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  return persistHumanGateRoute({
    appendEnvelope: finalizeInput.appendEnvelope,
    writeState: finalizeInput.writeState,
    statePath: finalizeInput.resolved.bubblePaths.statePath,
    transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath,
    inboxPath: finalizeInput.resolved.bubblePaths.inboxPath,
    lockPath: buildGateLockPath({
      locksDir: finalizeInput.resolved.bubblePaths.locksDir,
      bubbleId: finalizeInput.resolved.bubbleId
    }),
    now: finalizeInput.now,
    nowIso: finalizeInput.now.toISOString(),
    bubbleId: finalizeInput.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: finalizeInput.summary,
      fallbackReason: input.fallbackReason
    }),
    refs: finalizeInput.refs,
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: "human_gate_dispatch_failed",
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(
        input.runResultForRouting.report_json
      ),
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  });
}

async function persistResolvedHumanRoute(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  budgetAvailable: boolean;
  parityMetadata: FindingsParityMetadata | null;
  stickyHumanGate: boolean;
}): Promise<MetaReviewGateResult> {
  const finalizeInput = input.finalizeInput;
  const route = input.stickyHumanGate
    ? "human_gate_sticky_bypass"
    : resolveHumanGateRoute(
        input.runResultForRouting.recommendation,
        input.budgetAvailable
      );
  return persistHumanGateRoute({
    appendEnvelope: finalizeInput.appendEnvelope,
    writeState: finalizeInput.writeState,
    statePath: finalizeInput.resolved.bubblePaths.statePath,
    transcriptPath: finalizeInput.resolved.bubblePaths.transcriptPath,
    inboxPath: finalizeInput.resolved.bubblePaths.inboxPath,
    lockPath: buildGateLockPath({
      locksDir: finalizeInput.resolved.bubblePaths.locksDir,
      bubbleId: finalizeInput.resolved.bubbleId
    }),
    now: finalizeInput.now,
    nowIso: finalizeInput.now.toISOString(),
    bubbleId: finalizeInput.resolved.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: finalizeInput.summary,
      metaReviewRun: input.runResultForRouting
    }),
    refs: finalizeInput.refs,
    loaded: finalizeInput.loaded,
    expectedState: "RUNNING",
    route,
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(
        input.runResultForRouting.report_json
      )
  });
}

async function dispatchAutoRework(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  snapshot: ReturnType<typeof normalizeMetaReviewSnapshot>;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult> {
  const reworkMessage = input.runResultForRouting.rework_target_message;
  if (reworkMessage === null || reworkMessage.trim().length === 0) {
    return persistDispatchFailedHumanRoute({
      finalizeInput: input.finalizeInput,
      loaded: input.finalizeInput.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch",
      rollbackStateOnAppendFailure: input.finalizeInput.loaded.state
    });
  }

  const nowIso = input.finalizeInput.now.toISOString();
  const nextRound = input.finalizeInput.loaded.state.round + 1;
  const resumed = assertValidBubbleStateSnapshot({
    ...input.finalizeInput.loaded.state,
    state: "RUNNING",
    round: nextRound,
    active_agent: input.finalizeInput.resolved.bubbleConfig.agents.implementer,
    active_role: "implementer",
    execution_context: buildRunningExecutionContext({
      bubbleId: input.finalizeInput.loaded.state.bubble_id,
      round: nextRound,
      activeRole: "implementer",
      startedAt: nowIso,
      watchdogTimeoutMinutes:
        input.finalizeInput.resolved.bubbleConfig.watchdog_timeout_minutes
    }),
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history: [
      ...input.finalizeInput.loaded.state.round_role_history,
      {
        round: nextRound,
        implementer: input.finalizeInput.resolved.bubbleConfig.agents.implementer,
        reviewer: input.finalizeInput.resolved.bubbleConfig.agents.reviewer,
        switched_at: nowIso
      }
    ],
    meta_review: clearLiveMetaReviewSnapshot(
      input.finalizeInput.loaded.state.meta_review
    )
  });

  let resumedWritten: LoadedStateSnapshot;
  try {
    resumedWritten = await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      resumed,
      {
        expectedFingerprint: input.finalizeInput.loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (isNamedError(error, "StateStoreConflictError")) {
      throw toGateConflictError(error);
    }
    throw toGateTransitionError(error);
  }

  try {
    const dispatched = await input.finalizeInput.appendEnvelope({
      transcriptPath: input.finalizeInput.resolved.bubblePaths.transcriptPath,
      mirrorPaths: [input.finalizeInput.resolved.bubblePaths.inboxPath],
      lockPath: buildGateLockPath({
        locksDir: input.finalizeInput.resolved.bubblePaths.locksDir,
        bubbleId: input.finalizeInput.resolved.bubbleId
      }),
      now: input.finalizeInput.now,
        envelope: {
        bubble_id: input.finalizeInput.resolved.bubbleId,
        sender: "orchestrator",
        recipient:
          input.finalizeInput.resolved.bubbleConfig.agents.implementer as AgentName,
        type: "APPROVAL_DECISION",
        // The resumed RUNNING state is already persisted on the next round,
        // so transcript authority must use that same round for later observation reconciliation.
        round: resumedWritten.state.round,
        payload: {
          decision: "rework",
          message: reworkMessage,
          metadata: {
            [deliveryTargetRoleMetadataKey]: "implementer",
            actor: "meta-reviewer",
            actor_agent: "codex",
            recommendation: input.runResultForRouting.recommendation,
            ...(input.runResultForRouting.run_id !== undefined
              ? { run_id: input.runResultForRouting.run_id }
              : {}),
            ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata)
          }
        },
        refs: input.finalizeInput.refs
      }
    });

    const hydratedMetaReview = incrementAutoReworkCount({
      ...resumedWritten.state,
      meta_review: normalizeMetaReviewSnapshot(resumedWritten.state.meta_review)
    }).meta_review;
    const hydratedResumed: BubbleStateSnapshot = {
      ...resumedWritten.state,
      meta_review: normalizeMetaReviewSnapshot(hydratedMetaReview)
    };
    const written = await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      hydratedResumed,
      {
        expectedFingerprint: resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );

    return {
      bubbleId: input.finalizeInput.resolved.bubbleId,
      route: "auto_rework",
      gateSequence: dispatched.sequence,
      gateEnvelope: dispatched.envelope,
      state: written.state,
      metaReviewRun: input.runResultForRouting
    };
  } catch (error) {
    const appendReason = error instanceof Error ? error.message : String(error);
    const restoredReady = applyStateTransition(resumedWritten.state, {
      to: "READY_FOR_HUMAN_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: nowIso
    });
    const restoredState: BubbleStateSnapshot = {
      ...restoredReady,
      round: input.finalizeInput.loaded.state.round,
      round_role_history: input.finalizeInput.loaded.state.round_role_history,
      meta_review: normalizeMetaReviewSnapshot(restoredReady.meta_review)
    };
    let readyLoaded: LoadedStateSnapshot;
    try {
      readyLoaded = await input.finalizeInput.writeState(
        input.finalizeInput.resolved.bubblePaths.statePath,
        restoredState,
        {
          expectedFingerprint: resumedWritten.fingerprint,
          expectedState: "RUNNING"
        }
      );
    } catch (restoreError) {
      if (isNamedError(restoreError, "StateStoreConflictError")) {
        throw toGateConflictError(restoreError);
      }
      throw toGateTransitionError(restoreError);
    }

    return persistDispatchFailedHumanRoute({
      finalizeInput: input.finalizeInput,
      loaded: readyLoaded,
      expectedState: "READY_FOR_HUMAN_APPROVAL",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}`,
      rollbackStateOnAppendFailure: readyLoaded.state
    });
  }
}

export async function finalizeCurrentRunMetaReviewGate(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult> {
  const snapshot = normalizeMetaReviewSnapshot(input.loaded.state.meta_review);

  if (input.runResult.status === "error") {
    return persistRunFailedHumanRoute(input);
  }

  const parity = await resolveCurrentRunParity({
    resolved: input.resolved,
    snapshot,
    runResult: input.runResult,
    readFileFn: input.readFileFn
  });

  if (!parity.ok) {
    return persistDispatchFailedHumanRoute({
      finalizeInput: input,
      loaded: input.loaded,
      expectedState: "RUNNING",
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: parity.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parity.reason}`,
      rollbackStateOnAppendFailure: input.loaded.state
    });
  }

  if (snapshot.sticky_human_gate) {
    return persistResolvedHumanRoute({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: parity.parityMetadata,
      stickyHumanGate: true
    });
  }

  if (
    parity.runResultForRouting.recommendation === "rework" &&
    parity.budgetAvailable
  ) {
    return dispatchAutoRework({
      finalizeInput: input,
      snapshot,
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: parity.parityMetadata
    });
  }

  return persistResolvedHumanRoute({
    finalizeInput: input,
    runResultForRouting: parity.runResultForRouting,
    budgetAvailable: parity.budgetAvailable,
    parityMetadata: parity.parityMetadata,
    stickyHumanGate: false
  });
}
