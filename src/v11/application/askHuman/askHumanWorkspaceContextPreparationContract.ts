import type { ActorEmitContextSnapshot } from "../../shared/actorProtocol/actorEmitContext.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  AskHumanEnsureBubbleIdentityResult,
  AskHumanLoadedStateSnapshot,
  AskHumanResolvedBubbleWorkspace,
  ResolvedAskHumanRoutingPreparationDependencies
} from "./askHumanRoutingPreparationDependencyResolutionContract.js";

export interface PrepareAskHumanWorkspaceContextInput {
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now: Date;
  dependencies: ResolvedAskHumanRoutingPreparationDependencies;
}

export interface PreparedAskHumanWorkspaceContext {
  resolved: AskHumanResolvedBubbleWorkspace;
  bubbleIdentity: AskHumanEnsureBubbleIdentityResult;
  loadedState: AskHumanLoadedStateSnapshot;
  state: BubbleStateSnapshot;
}
