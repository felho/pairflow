import type {
  ensureBubbleInstanceIdForMutation
} from "../../../core/bubble/bubbleInstanceId.js";
import type {
  resolveBubbleFromWorkspaceCwd
} from "../../../core/bubble/workspaceResolution.js";
import type {
  readStateSnapshot
} from "../../../core/state/stateStore.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface PrepareAskHumanRoutingInput {
  question: string;
  refs?: string[];
  cwd?: string;
  now: Date;
  createError: (message: string) => Error;
}

export type PrepareAskHumanRoutingResult = AskHumanRoutingContext;

export interface PrepareAskHumanRoutingDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
}

export type PrepareAskHumanRoutingFn = (
  input: PrepareAskHumanRoutingInput,
  dependencies?: PrepareAskHumanRoutingDependencies
) => Promise<PrepareAskHumanRoutingResult>;
