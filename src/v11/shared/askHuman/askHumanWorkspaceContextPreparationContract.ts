import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type { ResolvedBubbleWorkspace } from "../../infrastructure/executor/workspace/workspaceResolution.js";
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
