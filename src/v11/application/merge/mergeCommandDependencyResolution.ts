import { mergeBubbleDependencyDefaults } from "../../../core/bubble/mergeBubbleDefaults.js";
import type { MergeBubbleDependencies } from "./mergeCommandContract.js";

export interface ResolvedMergeCommandDependencies {
  runGit: typeof mergeBubbleDependencyDefaults.runGit;
  resolveBubbleById: typeof mergeBubbleDependencyDefaults.resolveBubbleById;
  readStateSnapshot: typeof mergeBubbleDependencyDefaults.readStateSnapshot;
  writeStateSnapshot: typeof mergeBubbleDependencyDefaults.writeStateSnapshot;
  branchExists: typeof mergeBubbleDependencyDefaults.branchExists;
  terminateBubbleTmuxSession: typeof mergeBubbleDependencyDefaults.terminateBubbleTmuxSession;
  removeRuntimeSession: typeof mergeBubbleDependencyDefaults.removeRuntimeSession;
  cleanupWorktreeWorkspace: typeof mergeBubbleDependencyDefaults.cleanupWorktreeWorkspace;
  ensureBubbleInstanceIdForMutation: typeof mergeBubbleDependencyDefaults.ensureBubbleInstanceIdForMutation;
  emitBubbleLifecycleEventBestEffort: typeof mergeBubbleDependencyDefaults.emitBubbleLifecycleEventBestEffort;
}

export function resolveMergeCommandDependencies(
  dependencies: MergeBubbleDependencies = {}
): ResolvedMergeCommandDependencies {
  return {
    runGit: dependencies.runGit ?? mergeBubbleDependencyDefaults.runGit,
    resolveBubbleById:
      dependencies.resolveBubbleById ?? mergeBubbleDependencyDefaults.resolveBubbleById,
    readStateSnapshot:
      dependencies.readStateSnapshot ?? mergeBubbleDependencyDefaults.readStateSnapshot,
    writeStateSnapshot:
      dependencies.writeStateSnapshot ?? mergeBubbleDependencyDefaults.writeStateSnapshot,
    branchExists: dependencies.branchExists ?? mergeBubbleDependencyDefaults.branchExists,
    terminateBubbleTmuxSession:
      dependencies.terminateBubbleTmuxSession
      ?? mergeBubbleDependencyDefaults.terminateBubbleTmuxSession,
    removeRuntimeSession:
      dependencies.removeRuntimeSession ?? mergeBubbleDependencyDefaults.removeRuntimeSession,
    cleanupWorktreeWorkspace:
      dependencies.cleanupWorktreeWorkspace
      ?? mergeBubbleDependencyDefaults.cleanupWorktreeWorkspace,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? mergeBubbleDependencyDefaults.ensureBubbleInstanceIdForMutation,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
      ?? mergeBubbleDependencyDefaults.emitBubbleLifecycleEventBestEffort
  };
}
