import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../../core/bubble/bubbleInstanceId.js";
import type { ActorEmitContextSnapshot } from "../../../core/bubble/actorEmitContext.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { LoadedStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedAskHumanRoutingPreparationDependencies } from "./askHumanRoutingPreparationDependencyResolutionContract.js";

export interface PrepareAskHumanWorkspaceContextInput {
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now: Date;
  dependencies: ResolvedAskHumanRoutingPreparationDependencies;
}

export interface PreparedAskHumanWorkspaceContext {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
}
