import { readStateSnapshot, writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { branchExists, runGit } from "../../../core/workspace/git.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { cleanupWorktreeWorkspace } from "../../../core/workspace/worktreeManager.js";
import { terminateBubbleTmuxSession } from "../../../core/runtime/tmuxManager.js";
import { removeRuntimeSession } from "../../../core/runtime/sessionsRegistry.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
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
