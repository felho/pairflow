import { resolve } from "node:path";

import { startCommandContextDefaults } from "../../startCommandDependencyDefaults.js";
import { buildBubbleTmuxSessionName } from "../../../../shared/bubble/tmuxSessionName.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import type { StartLoadedStateSnapshot } from "./startStatePersistence.js";
import { DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY } from "../../../../../config/defaults.js";
import type { ReviewerFocusExtractionResult } from "../../../../shared/reviewer/reviewerBrief.js";
import type { RuntimeSessionRecord } from "../../../../ports/runtimeSessions.js";
import type { StartBubbleInput } from "../../startCommandContract.js";
import type {
  EnsureReviewerPolicySnapshotPort,
  EnsureReviewerPolicySnapshotResult,
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../../../ports/reviewerArtifacts.js";
import type {
  BubbleRemotePointer
} from "../../../../shared/remote/remoteExecutionTypes.js";
import { resolveStartBubbleMode } from "../../startCommandOrchestration.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import {
  resolveRemoteCloneStartContextFromEnv,
  type RemoteCloneStartContext
} from "../remote/startCommandRemoteExecutionContext.js";

export type StartLoadedState = StartLoadedStateSnapshot;
export type ResolvedStartBubble =
  Awaited<ReturnType<typeof startCommandContextDefaults.resolveBubbleById>>;
export const reviewerPolicySnapshotUnavailableReasonCode =
  "REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE";
const pairflowWorktreeRootEnvVar = "PAIRFLOW_WORKTREE_ROOT";

function resolveOptionalWorkspaceEnvPath(
  envVar: string
): string | undefined {
  const rawValue = process.env[envVar];
  if (typeof rawValue !== "string") {
    return undefined;
  }

  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return resolve(trimmed);
}

async function assertVerifiedRemoteCloneContext(input: {
  resolved: ResolvedStartBubble;
  remoteStartContext: RemoteCloneStartContext;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
}): Promise<void> {
  const normalizedWorkspaceRoot = resolve(input.remoteStartContext.workspaceRoot);
  const pairflowWorktreeRoot = resolveOptionalWorkspaceEnvPath(
    pairflowWorktreeRootEnvVar
  );

  if (pairflowWorktreeRoot !== normalizedWorkspaceRoot) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.resolved.bubbleId} remote inner-start env is only valid inside a verified remote clone workspace authority.`,
      context: {
        bubble_id: input.resolved.bubbleId,
        remote_workspace_root: normalizedWorkspaceRoot,
        pairflow_worktree_root: pairflowWorktreeRoot ?? null,
        required_env_var: pairflowWorktreeRootEnvVar
      }
    });
  }

  let remotePointer: BubbleRemotePointer | null;
  try {
    remotePointer = await input.readRemotePointer(
      input.resolved.bubblePaths.remotePointerPath
    );
  } catch (error) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.resolved.bubbleId} could not verify remote clone control-plane boundaries for inner-start env.`,
      context: {
        bubble_id: input.resolved.bubbleId,
        remote_pointer_path: input.resolved.bubblePaths.remotePointerPath
      },
      cause: error
    });
  }

  if (remotePointer !== null) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.resolved.bubbleId} refused remote inner-start env because local source-repo remote artifacts are still present.`,
      context: {
        bubble_id: input.resolved.bubbleId,
        remote_pointer_kind: remotePointer.kind,
        remote_pointer_path: input.resolved.bubblePaths.remotePointerPath
      }
    });
  }
}

function assertReviewerPolicySnapshotAvailable(
  result: EnsureReviewerPolicySnapshotResult
): string {
  if (result.ok) {
    return result.policySnapshotPathAbs;
  }
  throw createStartBubbleError({
    reasonCode: reviewerPolicySnapshotUnavailableReasonCode,
    message: result.reason,
    context: {
      artifact_path: result.artifactPathAbs,
      source_doc: result.sourceDoc,
      stage: result.stage
    },
    ...(result.cause !== undefined ? { cause: result.cause } : {})
  });
}

export interface StartExecutionContext {
  resolved: ResolvedStartBubble;
  now: Date;
  nowIso: string;
  bubbleIdentity:
    Awaited<
      ReturnType<typeof startCommandContextDefaults.ensureBubbleInstanceIdForMutation>
    >;
  loadedState: StartLoadedState;
  startMode: ReturnType<typeof resolveStartBubbleMode>;
  expectedTmuxSessionName: string;
  policySnapshotPathAbs: string;
  runtimeSessionRecord?: RuntimeSessionRecord;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  remoteStartContext?: RemoteCloneStartContext;
}

export async function loadStartExecutionContext(
  input: StartBubbleInput,
  dependencies: {
    ensureReviewerPolicySnapshot: EnsureReviewerPolicySnapshotPort;
    readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
    readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
    readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  },
  options: {
    resolved?: ResolvedStartBubble;
  } = {}
): Promise<StartExecutionContext> {
  const resolved =
    options.resolved
    ?? await startCommandContextDefaults.resolveBubbleById({
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const bubbleIdentity =
    await startCommandContextDefaults.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const reviewerBriefText = await dependencies.readReviewerBriefArtifact(
    resolved.bubblePaths.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await dependencies.readReviewerFocusArtifact(
    resolved.bubblePaths.reviewerFocusArtifactPath
  ).catch(() => undefined);
  const policySnapshotPathAbs = assertReviewerPolicySnapshotAvailable(
    await dependencies.ensureReviewerPolicySnapshot({
      artifactsDir: resolved.bubblePaths.artifactsDir,
      reviewerBlockingMinSeverity:
        resolved.bubbleConfig.review_policy?.reviewer_blocking_min_severity
      ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY
    })
  );
  const loadedPersisted =
    await startCommandContextDefaults.readStateSnapshot(resolved.bubblePaths.statePath);
  const loadedState: StartLoadedState = {
    state: buildBubbleStateSnapshotVariant(loadedPersisted.state),
    fingerprint: loadedPersisted.fingerprint
  };
  const remoteStartContext = resolveRemoteCloneStartContextFromEnv();
  if (
    remoteStartContext !== undefined
    && resolved.bubbleConfig.executor?.type !== "ssh"
  ) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${resolved.bubbleId} received remote inner-start env context but is not configured for remote SSH execution.`,
      context: {
        bubble_id: resolved.bubbleId,
        executor_type: resolved.bubbleConfig.executor?.type ?? null
      }
    });
  }
  if (remoteStartContext !== undefined) {
    await assertVerifiedRemoteCloneContext({
      resolved,
      remoteStartContext,
      readRemotePointer: dependencies.readRemotePointer
    });
  }

  return {
    resolved,
    now,
    nowIso,
    bubbleIdentity,
    loadedState,
    startMode: resolveStartBubbleMode(loadedState.state.state),
    expectedTmuxSessionName: buildBubbleTmuxSessionName(resolved.bubbleId),
    policySnapshotPathAbs,
    ...(remoteStartContext !== undefined ? { remoteStartContext } : {}),
    ...(reviewerBriefText !== undefined ? { reviewerBriefText } : {}),
    ...(reviewerFocus !== undefined ? { reviewerFocus } : {})
  };
}
