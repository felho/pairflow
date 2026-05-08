import type {
  AgentName,
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  AskHumanEnsureBubbleIdentityResult,
  AskHumanLoadedStateSnapshot,
  AskHumanResolvedBubbleWorkspace
} from "./askHumanRoutingPreparationDependencyResolutionContract.js";
import type { AskHumanActivationProvenance } from "./askHumanCommandContract.js";

type AskHumanActiveRole = Exclude<AgentRole, "meta_reviewer">;

export interface AskHumanRunningState extends BubbleStateSnapshot {
  state: "RUNNING";
  active_agent: AgentName;
  active_role: AskHumanActiveRole;
  active_since: string;
}

export interface AskHumanRoutingContext {
  nowIso: string;
  question: string;
  refs: string[];
  resolved: AskHumanResolvedBubbleWorkspace;
  bubbleIdentity: AskHumanEnsureBubbleIdentityResult;
  loadedState: AskHumanLoadedStateSnapshot;
  state: AskHumanRunningState;
  activation?: AskHumanActivationProvenance;
}
