import type {
  PreparedAskHumanWorkspaceContext,
  PrepareAskHumanWorkspaceContextInput
} from "./askHumanWorkspaceContextPreparationContract.js";

export async function prepareAskHumanWorkspaceContext(
  input: PrepareAskHumanWorkspaceContextInput
): Promise<PreparedAskHumanWorkspaceContext> {
  const resolved = await input.dependencies.resolveBubble(input.cwd);
  const bubbleIdentity = await input.dependencies.ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await input.dependencies.readState(
    resolved.bubblePaths.statePath
  );

  return {
    resolved,
    bubbleIdentity,
    loadedState,
    state: loadedState.state
  };
}
