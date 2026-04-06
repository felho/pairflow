import type { EnsureBubbleInstanceIdForMutationResult } from "../../../core/bubble/bubbleInstanceId.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { LoadedStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { AgentName, AgentRole, BubbleStateSnapshot } from "../../../types/bubble.js";

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
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  loadedState: LoadedStateSnapshot;
  state: AskHumanRunningState;
}
