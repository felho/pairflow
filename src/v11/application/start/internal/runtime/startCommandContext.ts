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
import { resolveStartBubbleMode } from "../../startCommandOrchestration.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import {
  resolveRemoteCloneStartContextFromEnv,
  type RemoteCloneStartContext
} from "../remote/startCommandRemoteExecutionContext.js";
import type {
  VerifyRemoteCloneStartAuthorityPort
} from "../../../../ports/remoteCloneStartAuthority.js";

export type StartLoadedState = StartLoadedStateSnapshot;
export type ResolvedStartBubble =
  Awaited<ReturnType<typeof startCommandContextDefaults.resolveBubbleById>>;
export const reviewerPolicySnapshotUnavailableReasonCode =
  "REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE";

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
    verifyRemoteCloneStartAuthority: VerifyRemoteCloneStartAuthorityPort;
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
    await dependencies.verifyRemoteCloneStartAuthority({
      bubbleId: resolved.bubbleId,
      remoteWorkspaceRoot: remoteStartContext.workspaceRoot,
      remotePointerPath: resolved.bubblePaths.remotePointerPath
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
