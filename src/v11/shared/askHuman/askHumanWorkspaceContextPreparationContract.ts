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
