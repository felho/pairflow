import { readFile } from "node:fs/promises";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import { runTmux } from "../../../core/runtime/tmuxManager.js";
import { readStateSnapshot, writeStateSnapshot, type LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import {
  appendMetaReviewKickoffEnvelope,
  persistMetaReviewRunFailedRoute,
  resolveMetaReviewerPaneWarning,
  restoreRunningAfterStagedReadyFailure,
  routeStickyHumanGateBypass,
  stageMetaReviewRunningState,
  stageReadyForApprovalState
} from "./metaReviewGateApplyHelpers.js";
import {
  assertRunningConvergenceState,
  buildGateLockPath,
  normalizeMetaReviewSnapshot
} from "./metaReviewGateShared.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  MetaReviewGateResult,
  NotifyMetaReviewerSubmissionRequest
} from "./metaReviewGateTypes.js";

interface ApplyMetaReviewGateExecutionContext {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  runTmuxRunner: typeof runTmux;
  readFileFn: typeof readFile;
  now: Date;
  nowIso: string;
  refs: string[];
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  lockPath: string;
  deactivateMetaReviewerPane: () => Promise<void>;
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}

async function initializeApplyMetaReviewGateExecutionContext(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): Promise<ApplyMetaReviewGateExecutionContext> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const writeState = dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const appendEnvelope = dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const setMetaReviewerPane =
    dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding;
  const notifySubmissionRequest =
    dependencies.notifyMetaReviewerSubmissionRequest ?? notifyMetaReviewerSubmissionRequest;
  const runTmuxRunner = dependencies.runTmux ?? runTmux;
  const readFileFn = dependencies.readFile ?? readFile;
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
  const loadedRunning = await readState(resolved.bubblePaths.statePath);
  assertRunningConvergenceState(loadedRunning.state);
  const readyForApproval = await stageReadyForApprovalState({
    loadedRunning,
    nowIso,
    statePath: resolved.bubblePaths.statePath,
    writeState
  });

  return {
    appendEnvelope,
    writeState,
    setMetaReviewerPane,
    notifySubmissionRequest,
    runTmuxRunner,
    readFileFn,
    now,
    nowIso,
    refs,
    resolved,
    lockPath,
    deactivateMetaReviewerPane,
    loadedRunning,
    readyForApproval
  };
}

async function routeMetaReviewKickoffOrRunFailed(
  input: {
    context: ApplyMetaReviewGateExecutionContext;
    convergenceSummary: string;
    metaReviewRunningState: LoadedStateSnapshot;
    shouldDeactivateMetaReviewerPane: boolean;
  }
): Promise<MetaReviewGateResult> {
  try {
    const appended = await appendMetaReviewKickoffEnvelope({
      appendEnvelope: input.context.appendEnvelope,
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      inboxPath: input.context.resolved.bubblePaths.inboxPath,
      lockPath: input.context.lockPath,
      now: input.context.now,
      bubbleId: input.context.resolved.bubbleId,
      round: input.metaReviewRunningState.state.round,
      refs: input.context.refs
    });

    return {
      bubbleId: input.context.resolved.bubbleId,
      route: "meta_review_running",
      gateSequence: appended.sequence,
      gateEnvelope: appended.envelope,
      state: input.metaReviewRunningState.state
    };
  } catch (error) {
    const runFailureReason = error instanceof Error ? error.message : String(error);
    try {
      return await persistMetaReviewRunFailedRoute({
        appendEnvelope: input.context.appendEnvelope,
        writeState: input.context.writeState,
        statePath: input.context.resolved.bubblePaths.statePath,
        transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
        inboxPath: input.context.resolved.bubblePaths.inboxPath,
        lockPath: input.context.lockPath,
        now: input.context.now,
        nowIso: input.context.nowIso,
        bubbleId: input.context.resolved.bubbleId,
        convergenceSummary: input.convergenceSummary,
        fallbackReason: `META_REVIEW_GATE_RUN_FAILED: ${runFailureReason}`,
        refs: input.context.refs,
        loaded: input.metaReviewRunningState
      });
    } finally {
      if (input.shouldDeactivateMetaReviewerPane) {
        await input.context.deactivateMetaReviewerPane();
      }
    }
  }
}

export async function applyMetaReviewGateOnConvergence(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies = {}
): Promise<MetaReviewGateResult> {
  const context = await initializeApplyMetaReviewGateExecutionContext(
    input,
    dependencies
  );

  const readyMetaReview = normalizeMetaReviewSnapshot(
    context.readyForApproval.state.meta_review
  );

  if (readyMetaReview.sticky_human_gate) {
    return routeStickyHumanGateBypass({
      appendEnvelope: context.appendEnvelope,
      writeState: context.writeState,
      readFileFn: context.readFileFn,
      bubblePaths: context.resolved.bubblePaths,
      lockPath: context.lockPath,
      now: context.now,
      nowIso: context.nowIso,
      bubbleId: context.resolved.bubbleId,
      summary: input.summary,
      refs: context.refs,
      loadedRunning: context.loadedRunning,
      readyForApproval: context.readyForApproval
    });
  }

  let metaReviewRunningState: LoadedStateSnapshot;
  try {
    metaReviewRunningState = await stageMetaReviewRunningState({
      readyForApproval: context.readyForApproval,
      nowIso: context.nowIso,
      statePath: context.resolved.bubblePaths.statePath,
      writeState: context.writeState
    });
  } catch (error) {
    return restoreRunningAfterStagedReadyFailure({
      rootError: error,
      stageReasonCode: "META_REVIEW_GATE_META_REVIEW_STAGE_TRANSITION_FAILED",
      writeState: context.writeState,
      statePath: context.resolved.bubblePaths.statePath,
      loadedRunning: context.loadedRunning,
      readyForApproval: context.readyForApproval
    });
  }

  const paneBinding = await resolveMetaReviewerPaneWarning({
    setMetaReviewerPane: context.setMetaReviewerPane,
    notifySubmissionRequest: context.notifySubmissionRequest,
    runTmuxRunner: context.runTmuxRunner,
    sessionsPath: context.resolved.bubblePaths.sessionsPath,
    bubbleId: context.resolved.bubbleId,
    round: metaReviewRunningState.state.round,
    now: context.now
  });
  const metaReviewerPaneWarning = paneBinding.warning;
  const shouldDeactivateMetaReviewerPane = paneBinding.shouldDeactivate;

  if (metaReviewerPaneWarning !== null) {
    if (shouldDeactivateMetaReviewerPane) {
      await context.deactivateMetaReviewerPane();
    }
    return persistMetaReviewRunFailedRoute({
      appendEnvelope: context.appendEnvelope,
      writeState: context.writeState,
      statePath: context.resolved.bubblePaths.statePath,
      transcriptPath: context.resolved.bubblePaths.transcriptPath,
      inboxPath: context.resolved.bubblePaths.inboxPath,
      lockPath: context.lockPath,
      now: context.now,
      nowIso: context.nowIso,
      bubbleId: context.resolved.bubbleId,
      convergenceSummary: input.summary,
      fallbackReason:
        `META_REVIEW_GATE_RUN_FAILED: structured submit request unavailable (${metaReviewerPaneWarning}).`,
      refs: context.refs,
      loaded: metaReviewRunningState
    });
  }

  return routeMetaReviewKickoffOrRunFailed({
    context,
    convergenceSummary: input.summary,
    metaReviewRunningState,
    shouldDeactivateMetaReviewerPane
  });
}
