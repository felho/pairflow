import type { RuntimeSessionRecord } from "../../shared/ports/runtimeSessions.js";
import type { WorkspaceKind } from "../../shared/ports/worktreeWorkspace.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { StartBubbleError } from "./startCommandRuntime.js";

function resolveInitialRuntimeLaunchWorkspaceAuthority(input: {
  startMode: StartExecutionContext["startMode"];
  launchWorkspacePath: string;
  launchWorkspaceKind: WorkspaceKind;
}): {
  workspacePath?: string;
  workspaceKind?: WorkspaceKind;
} {
  if (input.startMode === "fresh") {
    // Fresh start claims runtime ownership before bootstrap resolves the
    // canonical launch workspace authority, so Phase 1C1 keeps this empty.
    return {};
  }
  return {
    // Resume reuses the Phase 1C1 canonical no-split launch workspace root.
    workspacePath: input.launchWorkspacePath,
    workspaceKind: input.launchWorkspaceKind
  };
}

function inferPersistedLaunchWorkspaceKind(
  record: RuntimeSessionRecord
): WorkspaceKind | undefined {
  const workspacePath = record.workspacePath?.trim();
  if ((workspacePath?.length ?? 0) > 0) {
    return record.workspaceKind
      ?? (workspacePath === record.worktreePath.trim() ? "worktree" : "clone");
  }
  return undefined;
}

function resolveRetryRuntimeLaunchWorkspaceAuthority(input: {
  startMode: StartExecutionContext["startMode"];
  initialWorkspaceAuthority: {
    workspacePath?: string;
    workspaceKind?: WorkspaceKind;
  };
  existingRecord: RuntimeSessionRecord;
}): {
  workspacePath?: string;
  workspaceKind?: WorkspaceKind;
} {
  const persistedWorkspacePath = input.existingRecord.workspacePath?.trim();
  const persistedWorkspaceKind = inferPersistedLaunchWorkspaceKind(
    input.existingRecord
  );
  if (
    (persistedWorkspacePath?.length ?? 0) > 0
    && persistedWorkspaceKind !== undefined
  ) {
    return {
      workspacePath: persistedWorkspacePath!,
      workspaceKind: persistedWorkspaceKind
    };
  }
  if (input.startMode === "fresh") {
    return {};
  }
  return input.initialWorkspaceAuthority;
}

export async function claimRuntimeSessionOwnership(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<RuntimeSessionRecord> {
  const initialWorkspaceAuthority = resolveInitialRuntimeLaunchWorkspaceAuthority({
    startMode: input.context.startMode,
    launchWorkspacePath: input.context.resolved.bubblePaths.worktreePath,
    launchWorkspaceKind: input.context.resolved.bubbleConfig.work_mode
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
  let ownershipClaimed = firstClaim.claimed;
  let ownedRecord = firstClaim.record;
  if (!ownershipClaimed) {
    const sessionAlive = await input.deps.isTmuxSessionAlive(
      firstClaim.record.tmuxSessionName
    );
    if (!sessionAlive) {
      const retryWorkspaceAuthority = resolveRetryRuntimeLaunchWorkspaceAuthority({
        startMode: input.context.startMode,
        initialWorkspaceAuthority,
        existingRecord: firstClaim.record
      });
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
