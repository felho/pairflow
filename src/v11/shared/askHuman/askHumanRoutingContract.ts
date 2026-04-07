import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";
import type {
  EnsureAskHumanBubbleInstanceIdentity,
  ReadAskHumanStateSnapshot,
  ResolveAskHumanBubbleFromWorkspaceCwd
} from "./askHumanRoutingPreparationDependencyResolutionContract.js";

export interface PrepareAskHumanRoutingInput {
  question: string;
  refs?: string[];
  cwd?: string;
  authoritativeContext?: ActorEmitContextSnapshot;
  now: Date;
  createError: PairflowCreateCommandError;
}

export type PrepareAskHumanRoutingResult = AskHumanRoutingContext;

export interface PrepareAskHumanRoutingDependencies {
  resolveBubbleFromWorkspaceCwd?: ResolveAskHumanBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: EnsureAskHumanBubbleInstanceIdentity;
  readStateSnapshot?: ReadAskHumanStateSnapshot;
}

export type PrepareAskHumanRoutingFn = (
  input: PrepareAskHumanRoutingInput,
  dependencies?: PrepareAskHumanRoutingDependencies
) => Promise<PrepareAskHumanRoutingResult>;
