import {
  assertRunningConvergenceState,
  buildGateLockPath
} from "./metaReviewGateShared.js";
import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../ports/transcript.js";
import type { SetMetaReviewerPaneBindingPort } from "../ports/runtimeSessions.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  NotifyMetaReviewerSubmissionRequest
} from "./metaReviewGateTypes.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

export interface ApplyMetaReviewGateExecutionContext {
  appendEnvelope: AppendProtocolEnvelopePort;
  readTranscript: ReadTranscriptEnvelopesPort;
  readState: ReadStateSnapshotPort;
  writeState: WriteStateSnapshotPort;
  setMetaReviewerPane: SetMetaReviewerPaneBindingPort;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  resolvePaneWarning:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveMetaReviewerPaneWarning"]>;
  runTmuxRunner: NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["runTmux"]>;
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
  const notifySubmissionRequest =
    requireApplyNotifySubmissionRequest(dependencies, input.bubbleId);
  const resolvePaneWarning = requireApplyPaneWarningResolver(
    dependencies,
    input.bubbleId
  );
  const runTmuxRunner = requireApplyTmuxRunner(dependencies, input.bubbleId);
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
    notifySubmissionRequest,
    resolvePaneWarning,
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

function requireApplyResolveBubbleById(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): ResolveBubbleByIdPort {
  if (dependencies.resolveBubbleById !== undefined) {
    return dependencies.resolveBubbleById;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate bubble resolution capability is unavailable."
  );
}

function requireApplyReadStateSnapshot(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): ReadStateSnapshotPort {
  if (dependencies.readStateSnapshot !== undefined) {
    return dependencies.readStateSnapshot;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate state read capability is unavailable."
  );
}

function requireApplyWriteStateSnapshot(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): WriteStateSnapshotPort {
  if (dependencies.writeStateSnapshot !== undefined) {
    return dependencies.writeStateSnapshot;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate state write capability is unavailable."
  );
}

function requireApplyAppendProtocolEnvelope(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): AppendProtocolEnvelopePort {
  if (dependencies.appendProtocolEnvelope !== undefined) {
    return dependencies.appendProtocolEnvelope;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate transcript append capability is unavailable."
  );
}

function requireApplyReadTranscriptEnvelopes(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): ReadTranscriptEnvelopesPort {
  if (dependencies.readTranscriptEnvelopes !== undefined) {
    return dependencies.readTranscriptEnvelopes;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate transcript read capability is unavailable."
  );
}

function requireApplySetMetaReviewerPaneBinding(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): SetMetaReviewerPaneBindingPort {
  if (dependencies.setMetaReviewerPaneBinding !== undefined) {
    return dependencies.setMetaReviewerPaneBinding;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate pane binding capability is unavailable."
  );
}

function requireApplyPaneWarningResolver(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveMetaReviewerPaneWarning"]> {
  if (dependencies.resolveMetaReviewerPaneWarning !== undefined) {
    return dependencies.resolveMetaReviewerPaneWarning;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate pane-binding capability is unavailable."
  );
}

function requireApplyNotifySubmissionRequest(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): NotifyMetaReviewerSubmissionRequest {
  if (dependencies.notifyMetaReviewerSubmissionRequest !== undefined) {
    return dependencies.notifyMetaReviewerSubmissionRequest;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate notify capability is unavailable."
  );
}

function requireApplyTmuxRunner(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["runTmux"]> {
  if (dependencies.runTmux !== undefined) {
    return dependencies.runTmux;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate tmux capability is unavailable."
  );
}

function requireApplyArtifactReadPort(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): MetaReviewArtifactReadPort {
  if (dependencies.readFile !== undefined) {
    return dependencies.readFile;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate artifact read capability is unavailable."
  );
}

function buildMissingApplyCapabilityError(
  bubbleId: string,
  message: string
): never {
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      bubbleId,
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}
