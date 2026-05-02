import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import { buildKickoffResolveBubbleInput } from "./kickoffValidationInputBuilders.js";

export interface KickoffValidationBubbleInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}

export type KickoffEligibilityResolvedBubble = Awaited<
  ReturnType<ResolvedKickoffDependencies["resolveBubble"]>
>;

export type KickoffEligibilityLoadedState = Awaited<
  ReturnType<ResolvedKickoffDependencies["readState"]>
>;

export interface LoadKickoffEligibilityStateResult {
  resolved: KickoffEligibilityResolvedBubble;
  loadedState: KickoffEligibilityLoadedState;
  state: KickoffEligibilityLoadedState["state"];
}

export async function loadKickoffEligibilityState(input: {
  validationInput: KickoffValidationBubbleInput;
  dependencies: Pick<ResolvedKickoffDependencies, "resolveBubble" | "readState">;
}): Promise<LoadKickoffEligibilityStateResult> {
  const resolved = await input.dependencies.resolveBubble(
    buildKickoffResolveBubbleInput(input.validationInput)
  );
  const loadedState = await input.dependencies.readState(
    resolved.bubblePaths.statePath
  );

  return {
    resolved,
    loadedState,
    state: loadedState.state
  };
}
