import { readStateSnapshot, writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { branchExists, runGit } from "../../infrastructure/workspace/git.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { cleanupWorktreeWorkspace } from "../../infrastructure/workspace/worktreeManager.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { removeRuntimeSession } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type { MergeBubbleDependencies } from "../../application/merge/mergeCommandContract.js";

export interface MergeCommandDependencies extends MergeBubbleDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  branchExists?: typeof branchExists;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

export interface ResolvedMergeCommandDependencies {
  runGit: typeof runGit;
  resolveBubbleById: typeof resolveBubbleById;
  readStateSnapshot: typeof readStateSnapshot;
  writeStateSnapshot: typeof writeStateSnapshot;
  branchExists: typeof branchExists;
  terminateBubbleTmuxSession: typeof terminateBubbleTmuxSession;
  removeRuntimeSession: typeof removeRuntimeSession;
  cleanupWorktreeWorkspace: typeof cleanupWorktreeWorkspace;
  ensureBubbleInstanceIdForMutation: typeof ensureBubbleInstanceIdForMutation;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
}

export function resolveMergeCommandDependencies(
  dependencies: MergeCommandDependencies = {}
): ResolvedMergeCommandDependencies {
  return {
    runGit: dependencies.runGit ?? runGit,
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById,
    readStateSnapshot: dependencies.readStateSnapshot ?? readStateSnapshot,
    writeStateSnapshot: dependencies.writeStateSnapshot ?? writeStateSnapshot,
    branchExists: dependencies.branchExists ?? branchExists,
    terminateBubbleTmuxSession:
      dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession,
    removeRuntimeSession: dependencies.removeRuntimeSession ?? removeRuntimeSession,
    cleanupWorktreeWorkspace:
      dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? ensureBubbleInstanceIdForMutation,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
      ?? emitBubbleLifecycleEventBestEffort
  };
}
