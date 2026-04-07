import type { BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubblePaths } from "../bubble/bubblePaths.js";

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

export type ResolveAskHumanBubbleFromWorkspaceCwd = (
  cwd?: string
) => Promise<AskHumanResolvedBubbleWorkspace>;

export type EnsureAskHumanBubbleInstanceIdentity = (
  input: AskHumanEnsureBubbleIdentityInput
) => Promise<AskHumanEnsureBubbleIdentityResult>;

export type ReadAskHumanStateSnapshot = (
  statePath: string
) => Promise<AskHumanLoadedStateSnapshot>;

export interface ResolveAskHumanRoutingPreparationDependenciesInput {
  resolveBubbleFromWorkspaceCwd?: ResolveAskHumanBubbleFromWorkspaceCwd | undefined;
  ensureBubbleInstanceIdForMutation?:
    | EnsureAskHumanBubbleInstanceIdentity
    | undefined;
  readStateSnapshot?: ReadAskHumanStateSnapshot | undefined;
}

export interface ResolvedAskHumanRoutingPreparationDependencies {
  resolveBubble: ResolveAskHumanBubbleFromWorkspaceCwd;
  ensureBubbleIdentity: EnsureAskHumanBubbleInstanceIdentity;
  readState: ReadAskHumanStateSnapshot;
}
