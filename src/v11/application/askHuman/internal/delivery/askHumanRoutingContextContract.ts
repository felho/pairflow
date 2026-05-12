import type {
  ActorActivationProvenance
} from "../../../../shared/actorProtocol/actorEmitContext.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { BubblePaths } from "../../../../shared/bubble/bubblePaths.js";
import type { BubbleStateSnapshot, BubbleStateRunningStandard } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";

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

// AskHumanRunningState is the narrowed variant produced by
// assertAskHumanRunningState. Structurally identical to
// BubbleStateRunningStandard (RUNNING + active_role !== meta_reviewer).
export type AskHumanRunningState = BubbleStateRunningStandard;

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
