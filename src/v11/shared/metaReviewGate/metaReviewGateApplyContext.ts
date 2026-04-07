import { readFile } from "node:fs/promises";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import { runTmux } from "../../../core/runtime/tmuxManager.js";
import {
  readStateSnapshot,
  type LoadedStateSnapshot,
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import { notifyMetaReviewerSubmissionRequest } from "./metaReviewGateNotify.js";
import { assertRunningConvergenceState, buildGateLockPath } from "./metaReviewGateShared.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  NotifyMetaReviewerSubmissionRequest
} from "./metaReviewGateTypes.js";

export interface ApplyMetaReviewGateExecutionContext {
  appendEnvelope: typeof appendProtocolEnvelope;
  readState: typeof readStateSnapshot;
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
}

export async function initializeApplyMetaReviewGateExecutionContext(
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

  return {
    appendEnvelope,
    readState,
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
    loadedRunning
  };
}
