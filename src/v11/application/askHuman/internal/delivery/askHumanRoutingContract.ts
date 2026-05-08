import type { ActorEmitContextSnapshot } from "../../../../shared/actorProtocol/actorEmitContext.js";
import type {
  AskHumanEnsureBubbleIdentityInput,
  AskHumanEnsureBubbleIdentityResult,
  AskHumanLoadedStateSnapshot,
  AskHumanResolvedBubbleWorkspace,
  AskHumanRoutingContext
} from "./askHumanRoutingContextContract.js";

export type ResolveAskHumanBubbleFromWorkspaceCwd = (
  cwd?: string
) => Promise<AskHumanResolvedBubbleWorkspace>;

export type EnsureAskHumanBubbleInstanceIdentity = (
  input: AskHumanEnsureBubbleIdentityInput
) => Promise<AskHumanEnsureBubbleIdentityResult>;

export type ReadAskHumanStateSnapshot = (
  statePath: string
) => Promise<AskHumanLoadedStateSnapshot>;

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

export interface ResolvedAskHumanRoutingPreparationDependencies {
  resolveBubble: ResolveAskHumanBubbleFromWorkspaceCwd;
  ensureBubbleIdentity: EnsureAskHumanBubbleInstanceIdentity;
  readState: ReadAskHumanStateSnapshot;
}

export type PrepareAskHumanRoutingFn = (
  input: PrepareAskHumanRoutingInput,
  dependencies?: PrepareAskHumanRoutingDependencies
) => Promise<PrepareAskHumanRoutingResult>;
