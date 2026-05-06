import {
  assertRunningConvergenceState,
  buildGateLockPath
} from "./metaReviewGateShared.js";
import type { MetaReviewArtifactReadPort } from "../../metaReview/metaReviewArtifactIo.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type { SetMetaReviewerPaneBindingPort } from "../../ports/runtimeSessions.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput
} from "../metaReviewGateRuntimeCapabilities.js";
import {
  requireApplyAppendProtocolEnvelope,
  requireApplyArtifactReadPort,
  requireApplyPaneWarningResolver,
  requireApplyReadStateSnapshot,
  requireApplyReadTranscriptEnvelopes,
  requireApplyResolveBubbleById,
  requireApplySetMetaReviewerPaneBinding,
  requireApplyWriteStateSnapshot
} from "./metaReviewGateApplyCapabilities.js";

export interface ApplyMetaReviewGateExecutionContext {
  appendEnvelope: AppendProtocolEnvelopePort;
  readTranscript: ReadTranscriptEnvelopesPort;
  readState: ReadStateSnapshotPort;
  writeState: WriteStateSnapshotPort;
  setMetaReviewerPane: SetMetaReviewerPaneBindingPort;
  notifySubmissionRequest:
    ApplyMetaReviewGateOnConvergenceDependencies["notifyMetaReviewerSubmissionRequest"];
  resolvePaneWarning:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveMetaReviewerPaneWarning"]>;
  runtime: ApplyMetaReviewGateOnConvergenceDependencies["runtime"];
  readFileFn: MetaReviewArtifactReadPort;
  now: Date;
  nowIso: string;
  refs: string[];
  resolved: Awaited<ReturnType<ResolveBubbleByIdPort>>;
  lockPath: string;
  deactivateMetaReviewerPane: () => Promise<void>;
  loadedRunning: LoadedStateSnapshot;
}

export async function initializeApplyMetaReviewGateExecutionContext(
  input: ApplyMetaReviewGateOnConvergenceInput,
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): Promise<ApplyMetaReviewGateExecutionContext> {
  const resolveBubble = requireApplyResolveBubbleById(dependencies, input.bubbleId);
  const readState = requireApplyReadStateSnapshot(dependencies, input.bubbleId);
  const writeState = requireApplyWriteStateSnapshot(dependencies, input.bubbleId);
  const appendEnvelope = requireApplyAppendProtocolEnvelope(dependencies, input.bubbleId);
  const readTranscript = requireApplyReadTranscriptEnvelopes(
    dependencies,
    input.bubbleId
  );
  const setMetaReviewerPane = requireApplySetMetaReviewerPaneBinding(
    dependencies,
    input.bubbleId
  );
  const resolvePaneWarning = requireApplyPaneWarningResolver(
    dependencies,
    input.bubbleId
  );
  const readFileFn = requireApplyArtifactReadPort(dependencies, input.bubbleId);
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
    readTranscript,
    readState,
    writeState,
    setMetaReviewerPane,
    notifySubmissionRequest: dependencies.notifyMetaReviewerSubmissionRequest,
    resolvePaneWarning,
    runtime: dependencies.runtime,
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
