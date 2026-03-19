import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../../core/bubble/bubbleInstanceId.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedAskHumanRoutingPreparationDependencies } from "./askHumanRoutingPreparationDependencyResolutionContract.js";

export interface PrepareAskHumanWorkspaceContextInput {
  cwd?: string | undefined;
  now: Date;
  dependencies: ResolvedAskHumanRoutingPreparationDependencies;
}

export interface PreparedAskHumanWorkspaceContext {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
}

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
