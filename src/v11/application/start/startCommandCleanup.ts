import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { executeStartFailedCleanupMutation } from "../../defaults/start/startStateMutation.js";

export async function cleanupFailedStart(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  ownershipClaimed: boolean;
  workspaceBootstrapped: boolean;
  tmuxSessionName: string | null;
  preparingState: BubbleStateSnapshot | null;
}): Promise<void> {
  if (input.tmuxSessionName !== null) {
    await input.deps.terminateTmux({
      sessionName: input.tmuxSessionName
    }).catch(() => undefined);
  }
  if (input.ownershipClaimed) {
    await input.deps.removeSession({
      sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
      bubbleId: input.context.resolved.bubbleId
    }).catch(() => undefined);
  }

  if (input.context.startMode === "fresh" && input.workspaceBootstrapped) {
    await input.deps.cleanup({
      repoPath: input.context.resolved.repoPath,
      bubbleBranch: input.context.resolved.bubbleConfig.bubble_branch,
      worktreePath: input.context.resolved.bubblePaths.worktreePath
    }).catch(() => undefined);
  }

  if (input.context.startMode === "fresh" && input.preparingState !== null) {
    await executeStartFailedCleanupMutation({
      statePath: input.context.resolved.bubblePaths.statePath,
      preparingState: input.preparingState,
      nowIso: input.context.nowIso,
      writeStateSnapshot: input.deps.writeState
    }).catch(() => undefined);
  }
}
