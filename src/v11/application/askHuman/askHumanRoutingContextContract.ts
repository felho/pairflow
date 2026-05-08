import type {
  AgentName,
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  ActorActivationProvenance
} from "../../shared/actorProtocol/actorEmitContext.js";
import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";

export interface AskHumanResolvedBubbleWorkspace {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  bubblePaths: BubblePaths;
  repoPath: string;
  worktreePath: string;
  cwd: string;
}

export interface AskHumanEnsureBubbleIdentityInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  now?: Date;
}

export interface AskHumanEnsureBubbleIdentityResult {
  bubbleInstanceId: string;
  bubbleConfig: BubbleConfig;
  backfilled: boolean;
}

export interface AskHumanLoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

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
  activation?: ActorActivationProvenance;
}
