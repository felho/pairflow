import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { StartBubbleError } from "./startCommandRuntime.js";

export async function claimRuntimeSessionOwnership(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<void> {
  const firstClaim = await input.deps.claimSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    tmuxSessionName: input.context.expectedTmuxSessionName,
    now: input.context.now
  });
  let ownershipClaimed = firstClaim.claimed;
  if (!ownershipClaimed) {
    const sessionAlive = await input.deps.isTmuxSessionAlive(
      firstClaim.record.tmuxSessionName
    );
    if (!sessionAlive) {
      await input.deps.removeSession({
        sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
        bubbleId: input.context.resolved.bubbleId
      });
      const retryClaim = await input.deps.claimSession({
        sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        tmuxSessionName: input.context.expectedTmuxSessionName,
        now: input.context.now
      });
      ownershipClaimed = retryClaim.claimed;
    }
  }
  if (!ownershipClaimed) {
    throw new StartBubbleError(
      `Runtime session already registered for bubble ${input.context.resolved.bubbleId}: ${firstClaim.record.tmuxSessionName}. Run bubble reconcile or clean up the stale session before starting again.`
    );
  }
}
