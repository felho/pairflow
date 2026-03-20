import { applyStateTransition } from "../../../core/state/machine.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";

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
    const failed = applyStateTransition(input.preparingState, {
      to: "FAILED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.context.nowIso
    });
    await writeStateSnapshot(input.context.resolved.bubblePaths.statePath, failed, {
      expectedState: "PREPARING_WORKSPACE"
    }).catch(() => undefined);
  }
}
