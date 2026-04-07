import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import {
  readStateSnapshot,
  type LoadedStateSnapshot,
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  assertRunningConvergenceState,
  buildGateLockPath
} from "./metaReviewGateShared.js";
import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  ApplyMetaReviewGateOnConvergenceInput,
  NotifyMetaReviewerSubmissionRequest
} from "./metaReviewGateTypes.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

export interface ApplyMetaReviewGateExecutionContext {
  appendEnvelope: typeof appendProtocolEnvelope;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  resolvePaneWarning:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveMetaReviewerPaneWarning"]>;
  runTmuxRunner: NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["runTmux"]>;
  readFileFn: MetaReviewArtifactReadPort;
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
    requireApplyNotifySubmissionRequest(dependencies);
  const resolvePaneWarning = requireApplyPaneWarningResolver(dependencies);
  const runTmuxRunner = requireApplyTmuxRunner(dependencies);
  const readFileFn = requireApplyArtifactReadPort(dependencies);
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

function requireApplyPaneWarningResolver(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveMetaReviewerPaneWarning"]> {
  if (dependencies.resolveMetaReviewerPaneWarning !== undefined) {
    return dependencies.resolveMetaReviewerPaneWarning;
  }
  return buildMissingApplyCapabilityError(
    "meta-review gate pane-binding capability is unavailable."
  );
}

function requireApplyNotifySubmissionRequest(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): NotifyMetaReviewerSubmissionRequest {
  if (dependencies.notifyMetaReviewerSubmissionRequest !== undefined) {
    return dependencies.notifyMetaReviewerSubmissionRequest;
  }
  return buildMissingApplyCapabilityError(
    "meta-review gate notify capability is unavailable."
  );
}

function requireApplyTmuxRunner(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["runTmux"]> {
  if (dependencies.runTmux !== undefined) {
    return dependencies.runTmux;
  }
  return buildMissingApplyCapabilityError(
    "meta-review gate tmux capability is unavailable."
  );
}

function requireApplyArtifactReadPort(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies
): MetaReviewArtifactReadPort {
  if (dependencies.readFile !== undefined) {
    return dependencies.readFile;
  }
  return buildMissingApplyCapabilityError(
    "meta-review gate artifact read capability is unavailable."
  );
}

function buildMissingApplyCapabilityError(message: string): never {
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`
  );
}
