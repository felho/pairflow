import {
  assertActorEmitContextSnapshotIntegrity
} from "../../../../shared/actorProtocol/actorEmitContext.js";
import type {
  PreparedAskHumanWorkspaceContext,
  PrepareAskHumanWorkspaceContextInput
} from "./askHumanWorkspaceContextPreparationContract.js";

export async function prepareAskHumanWorkspaceContext(
  input: PrepareAskHumanWorkspaceContextInput
): Promise<PreparedAskHumanWorkspaceContext> {
  if (input.authoritativeContext !== undefined) {
    assertActorEmitContextSnapshotIntegrity(input.authoritativeContext);
  }

  const authoritativeResolved: PreparedAskHumanWorkspaceContext["resolved"] | undefined =
    input.authoritativeContext === undefined
      ? undefined
      : {
          bubbleId: input.authoritativeContext.bubble_id,
          repoPath: input.authoritativeContext.repo,
          bubblePaths: input.authoritativeContext.resolved.bubblePaths,
          bubbleConfig: input.authoritativeContext.resolved.bubbleConfig,
          worktreePath: input.authoritativeContext.worktree_path,
          cwd: input.authoritativeContext.worktree_path
        };
  const resolved =
    authoritativeResolved
    ?? await input.dependencies.resolveBubble(input.cwd);
  const bubbleIdentity = await input.dependencies.ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState =
    input.authoritativeContext?.loaded_state
    ?? await input.dependencies.readState(resolved.bubblePaths.statePath);

  return {
    resolved,
    bubbleIdentity,
    loadedState,
    state: loadedState.state
  };
}
