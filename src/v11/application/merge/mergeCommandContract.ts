import type {
  CleanupWorktreeWorkspacePort
} from "../../shared/ports/worktreeWorkspace.js";
import type {
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type {
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type { RunGitPort } from "../../shared/ports/git.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { BranchExistsPort } from "../../shared/ports/git.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";

export interface MergeBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
  now?: Date | undefined;
}

export interface MergeBubbleResult {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export interface MergeBubbleDependencies {
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  cleanupWorktreeWorkspace?: CleanupWorktreeWorkspacePort;
  runGit?: RunGitPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  branchExists?: BranchExistsPort;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  emitBubbleLifecycleEventBestEffort?: EmitBubbleLifecycleEventBestEffortPort;
}
