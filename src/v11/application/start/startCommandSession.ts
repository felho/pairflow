import type { RuntimeSessionRecord } from "../../ports/runtimeSessions.js";
import type { WorkspaceKind } from "../../ports/worktreeWorkspace.js";
import {
  resolveRuntimeSessionWorkspaceAuthority
} from "../../shared/runtimeSessionWorkspaceAuthority.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { StartBubbleError } from "./startCommandRuntime.js";

function resolveVerifiedRemoteCloneWorkspaceAuthority(
  context: StartExecutionContext
): {
  workspacePath: string;
  workspaceKind: WorkspaceKind;
} | undefined {
  const workspacePath = context.remoteStartContext?.workspaceRoot?.trim();
  if ((workspacePath?.length ?? 0) === 0) {
    return undefined;
  }

  return {
    workspacePath: workspacePath!,
    workspaceKind: context.resolved.bubbleConfig.work_mode
  };
}

function resolveInitialRuntimeLaunchWorkspaceAuthority(input: {
  context: StartExecutionContext;
}): {
  workspacePath?: string;
  workspaceKind?: WorkspaceKind;
} {
  const verifiedRemoteCloneAuthority =
    resolveVerifiedRemoteCloneWorkspaceAuthority(input.context);
  if (verifiedRemoteCloneAuthority !== undefined) {
    return verifiedRemoteCloneAuthority;
  }

  if (input.context.startMode === "fresh") {
    // Fresh start claims runtime ownership before bootstrap resolves the
    // canonical launch workspace authority, so Phase 1C1 keeps this empty.
    return {};
  }
  return {
    // Resume reuses the Phase 1C1 canonical no-split launch workspace root.
    workspacePath: input.context.resolved.bubblePaths.worktreePath,
    workspaceKind: input.context.resolved.bubbleConfig.work_mode
  };
}

async function readPersistedRuntimeSessionRecord(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<RuntimeSessionRecord | undefined> {
  const registry = await input.deps.readSessions(
    input.context.resolved.bubblePaths.sessionsPath,
    { allowMissing: true }
  );
  return registry[input.context.resolved.bubbleId];
}

function resolveRetryRuntimeLaunchWorkspaceAuthority(input: {
  context: StartExecutionContext;
  bubbleId: string;
  requestedWorkspaceKind: WorkspaceKind;
  existingRecord: RuntimeSessionRecord;
}): {
  workspacePath?: string;
  workspaceKind?: WorkspaceKind;
} {
  const verifiedRemoteCloneAuthority =
    resolveVerifiedRemoteCloneWorkspaceAuthority(input.context);
  if (verifiedRemoteCloneAuthority !== undefined) {
    return verifiedRemoteCloneAuthority;
  }

  const resolution = resolveRuntimeSessionWorkspaceAuthority({
    runtimeSessionRecord: input.existingRecord
  });
  if (resolution.status !== "resolved") {
    throw new StartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        `Bubble ${input.bubbleId} cannot reclaim stale runtime session because runtime session canonical workspace authority is missing.`,
      context: {
        bubble_id: input.bubbleId,
        authority_source: "runtime_session",
        authority_resolution: resolution.reason,
        reclaim_reason: "stale_session_retry"
      }
    });
  }

  if (resolution.authority.workspaceKind !== input.requestedWorkspaceKind) {
    throw new StartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        input.requestedWorkspaceKind === "clone"
          ? `Bubble ${input.bubbleId} cannot reclaim stale runtime session because clone resume requires explicit clone canonical workspace authority.`
          : `Bubble ${input.bubbleId} cannot reclaim stale runtime session because runtime session workspace kind ${resolution.authority.workspaceKind} `
            + `does not match requested ${input.requestedWorkspaceKind}.`,
      context: {
        bubble_id: input.bubbleId,
        authority_source: "runtime_session",
        authority_resolution: "workspace_kind_mismatch",
        requested_workspace_kind: input.requestedWorkspaceKind,
        actual_workspace_kind: resolution.authority.workspaceKind,
        reclaim_reason: "stale_session_retry"
      }
    });
  }

  return {
    workspacePath: resolution.authority.workspacePath,
    workspaceKind: resolution.authority.workspaceKind
  };
}

export async function claimRuntimeSessionOwnership(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<RuntimeSessionRecord> {
  const cloneResumeRequiresPersistedAuthority =
    input.context.startMode === "resume"
    && input.context.resolved.bubbleConfig.work_mode === "clone";
  if (cloneResumeRequiresPersistedAuthority) {
    const existingRecord = await readPersistedRuntimeSessionRecord(input);
    if (existingRecord === undefined) {
      throw new StartBubbleError({
        reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
        message:
          `Bubble ${input.context.resolved.bubbleId} cannot resume tmux because clone resume requires persisted runtime session canonical workspace authority.`,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          authority_source: "runtime_session",
          authority_resolution: "runtime_session_missing"
        }
      });
    }
  }
  const initialWorkspaceAuthority = resolveInitialRuntimeLaunchWorkspaceAuthority({
    context: input.context
  });
  const firstClaim = await input.deps.claimSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    ...(initialWorkspaceAuthority.workspacePath !== undefined
      ? { workspacePath: initialWorkspaceAuthority.workspacePath }
      : {}),
    ...(initialWorkspaceAuthority.workspaceKind !== undefined
      ? { workspaceKind: initialWorkspaceAuthority.workspaceKind }
      : {}),
    tmuxSessionName: input.context.expectedTmuxSessionName,
    now: input.context.now
  });
  if (
    firstClaim.claimed
    && cloneResumeRequiresPersistedAuthority
  ) {
    await input.deps.removeSession({
      sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
      bubbleId: input.context.resolved.bubbleId
    }).catch(() => undefined);
    throw new StartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        `Bubble ${input.context.resolved.bubbleId} cannot resume tmux because clone resume requires persisted runtime session canonical workspace authority.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        authority_source: "runtime_session",
        authority_resolution: "runtime_session_missing"
      }
    });
  }
  let ownershipClaimed = firstClaim.claimed;
  let ownedRecord = firstClaim.record;
  if (!ownershipClaimed) {
    const sessionAlive = await input.deps.isTmuxSessionAlive(
      firstClaim.record.tmuxSessionName
    );
    if (!sessionAlive) {
      let retryWorkspaceAuthority;
      try {
        retryWorkspaceAuthority = resolveRetryRuntimeLaunchWorkspaceAuthority({
          context: input.context,
          bubbleId: input.context.resolved.bubbleId,
          requestedWorkspaceKind: input.context.resolved.bubbleConfig.work_mode,
          existingRecord: firstClaim.record
        });
      } catch (error) {
        await input.deps.removeSession({
          sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
          bubbleId: input.context.resolved.bubbleId
        }).catch(() => undefined);
        throw error;
      }
      await input.deps.removeSession({
        sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
        bubbleId: input.context.resolved.bubbleId
      });
      const retryClaim = await input.deps.claimSession({
        sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        ...(retryWorkspaceAuthority.workspacePath !== undefined
          ? { workspacePath: retryWorkspaceAuthority.workspacePath }
          : {}),
        ...(retryWorkspaceAuthority.workspaceKind !== undefined
          ? { workspaceKind: retryWorkspaceAuthority.workspaceKind }
          : {}),
        tmuxSessionName: input.context.expectedTmuxSessionName,
        now: input.context.now
      });
      ownershipClaimed = retryClaim.claimed;
      ownedRecord = retryClaim.record;
    }
  }
  if (!ownershipClaimed) {
    throw new StartBubbleError(
      `Runtime session already registered for bubble ${input.context.resolved.bubbleId}: ${firstClaim.record.tmuxSessionName}. Run bubble reconcile or clean up the stale session before starting again.`
    );
  }
  return ownedRecord;
}
