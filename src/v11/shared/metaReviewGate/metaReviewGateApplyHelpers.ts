import type { readFile } from "node:fs/promises";

import { applyStateTransition } from "../../../core/state/machine.js";
import type { appendProtocolEnvelope, AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import type { runTmux } from "../../../core/runtime/tmuxManager.js";
import { deliveryTargetRoleMetadataKey } from "../../../types/protocol.js";
import { readMetaReviewReportJsonArtifact, resolveFindingsParityMetadataFromReportJson } from "./metaReviewGateFindingsMetadata.js";
import { toMetaReviewGateError } from "./metaReviewGateErrorConversion.js";
import {
  buildHumanGateSummary,
  metaReviewGateRollbackAppliedReasonCode,
  metaReviewGateStagedReadyRestoreAppliedReasonCode,
  metaReviewGateStagedReadyRestoreStateConflictReasonCode,
  metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode,
  metaReviewerAgent,
  persistHumanGateRoute,
  toConflictError,
  toTransitionError
} from "./metaReviewGateShared.js";
import type {
  MetaReviewGateResult,
  NotifyMetaReviewerSubmissionRequest
} from "./metaReviewGateTypes.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

export async function stageReadyForApprovalState(input: {
  loadedRunning: LoadedStateSnapshot;
  nowIso: string;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  try {
    const nextReadyForApproval = applyStateTransition(input.loadedRunning.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.nowIso
    });
    return await input.writeState(input.statePath, nextReadyForApproval, {
      expectedFingerprint: input.loadedRunning.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  }
}

export async function restoreRunningAfterStagedReadyFailure(input: {
  rootError: unknown;
  stageReasonCode: string;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}): Promise<never> {
  const rootGateError = toMetaReviewGateError(input.rootError);
  try {
    await input.writeState(input.statePath, input.loadedRunning.state, {
      expectedFingerprint: input.readyForApproval.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    });
  } catch (restoreError) {
    const restoreReason = restoreError instanceof Error
      ? restoreError.message
      : String(restoreError);
    const restoreReasonCode =
      restoreError instanceof StateStoreConflictError
        ? metaReviewGateStagedReadyRestoreStateConflictReasonCode
        : metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode;
    throw new MetaReviewGateError(
      restoreError instanceof StateStoreConflictError
        ? "META_REVIEW_GATE_STATE_CONFLICT"
        : "META_REVIEW_GATE_TRANSITION_INVALID",
      `${restoreError instanceof StateStoreConflictError ? "META_REVIEW_GATE_STATE_CONFLICT" : "META_REVIEW_GATE_TRANSITION_INVALID"}: ${input.stageReasonCode}: failed after READY_FOR_APPROVAL staging and restore to RUNNING failed (restore_reason_code=${restoreReasonCode}; restore_error=${restoreReason}). Root error: ${rootGateError.message}`,
      {
        ...rootGateError.diagnostics,
        stageReasonCode: input.stageReasonCode,
        restoreReasonCode
      }
    );
  }
  throw new MetaReviewGateError(
    rootGateError.reasonCode,
    `${rootGateError.reasonCode}: ${input.stageReasonCode}: failed after READY_FOR_APPROVAL staging and restore to RUNNING applied (restore_reason_code=${metaReviewGateStagedReadyRestoreAppliedReasonCode}). Root error: ${rootGateError.message}`,
    {
      ...rootGateError.diagnostics,
      stageReasonCode: input.stageReasonCode,
      restoreReasonCode: metaReviewGateStagedReadyRestoreAppliedReasonCode
    }
  );
}

export async function stageMetaReviewRunningState(input: {
  readyForApproval: LoadedStateSnapshot;
  nowIso: string;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const nextMetaReviewRunning = applyStateTransition(input.readyForApproval.state, {
    to: "META_REVIEW_RUNNING",
    activeAgent: metaReviewerAgent,
    activeRole: "meta_reviewer",
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso
  });
  return input.writeState(
    input.statePath,
    nextMetaReviewRunning,
    {
      expectedFingerprint: input.readyForApproval.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    }
  );
}

export async function resolveMetaReviewerPaneWarning(input: {
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  runTmuxRunner: typeof runTmux;
  sessionsPath: string;
  bubbleId: string;
  round: number;
  now: Date;
}): Promise<{ warning: string | null; shouldDeactivate: boolean }> {
  let warning: string | null = null;
  let shouldDeactivate = false;
  const bindStart = await input.setMetaReviewerPane({
    sessionsPath: input.sessionsPath,
    bubbleId: input.bubbleId,
    active: true,
    now: input.now
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
    return {
      warning: `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`,
      shouldDeactivate: false
    };
  }
  if (!("record" in bindStart) || bindStart.record === undefined) {
    return { warning: null, shouldDeactivate: false };
  }

  shouldDeactivate = true;
  const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
  const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
  await input.notifySubmissionRequest(
    {
      bubbleId: input.bubbleId,
      round: input.round,
      targetPane
    },
    {
      runTmux: input.runTmuxRunner
    }
  ).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    warning = `META_REVIEWER_PANE_UNAVAILABLE: ${reason}`;
  });
  return { warning, shouldDeactivate };
}

export async function appendMetaReviewKickoffEnvelope(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  refs: string[];
}): Promise<AppendProtocolEnvelopeResult> {
  const kickoffSummary = [
    `Meta-review gate opened for bubble ${input.bubbleId} round ${input.round}.`,
    "Submit result through structured CLI:",
    `pairflow bubble meta-review submit --id ${input.bubbleId} --round ${input.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_artifact_ref":"artifacts/...","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}'].`
  ].join(" ");

  return input.appendEnvelope({
    transcriptPath: input.transcriptPath,
    mirrorPaths: [input.inboxPath],
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: metaReviewerAgent,
      type: "TASK",
      round: input.round,
      payload: {
        summary: kickoffSummary,
        metadata: {
          [deliveryTargetRoleMetadataKey]: "meta_reviewer",
          actor: "meta-review-gate",
          actor_agent: "orchestrator",
          lifecycle_state: "META_REVIEW_RUNNING"
        }
      },
      refs: input.refs
    }
  });
}

export async function persistMetaReviewRunFailedRoute(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  convergenceSummary: string;
  fallbackReason: string;
  refs: string[];
  loaded: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.appendEnvelope,
    writeState: input.writeState,
    statePath: input.statePath,
    transcriptPath: input.transcriptPath,
    inboxPath: input.inboxPath,
    lockPath: input.lockPath,
    now: input.now,
    nowIso: input.nowIso,
    bubbleId: input.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.convergenceSummary,
      fallbackReason: input.fallbackReason
    }),
    refs: input.refs,
    loaded: input.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: "human_gate_run_failed",
    fallbackRecommendation: "inconclusive",
    targetState: "META_REVIEW_FAILED",
    stickyHumanGate: false
  });
}

export async function routeStickyHumanGateBypass(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  readFileFn: typeof readFile;
  bubblePaths: Awaited<ReturnType<typeof resolveBubbleById>>["bubblePaths"];
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const parityArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: input.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn: input.readFileFn
  });
  try {
    return await persistHumanGateRoute({
      appendEnvelope: input.appendEnvelope,
      writeState: input.writeState,
      statePath: input.bubblePaths.statePath,
      transcriptPath: input.bubblePaths.transcriptPath,
      inboxPath: input.bubblePaths.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      nowIso: input.nowIso,
      bubbleId: input.bubbleId,
      summary: input.summary,
      refs: input.refs,
      loaded: input.readyForApproval,
      expectedState: "READY_FOR_APPROVAL",
      route: "human_gate_sticky_bypass",
      parityMetadata: resolveFindingsParityMetadataFromReportJson(
        parityArtifactRead.reportJson
      ),
      rollbackStateOnAppendFailure: input.loadedRunning.state
    });
  } catch (error) {
    const gateError = toMetaReviewGateError(error);
    if (
      gateError.diagnostics?.rollbackOutcome === "applied" &&
      gateError.diagnostics.rollbackReasonCode === metaReviewGateRollbackAppliedReasonCode
    ) {
      throw gateError;
    }
    return restoreRunningAfterStagedReadyFailure({
      rootError: gateError,
      stageReasonCode: "META_REVIEW_GATE_STICKY_BYPASS_ROUTE_FAILED",
      writeState: input.writeState,
      statePath: input.bubblePaths.statePath,
      loadedRunning: input.loadedRunning,
      readyForApproval: input.readyForApproval
    });
  }
}
