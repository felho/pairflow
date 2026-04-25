import type { MergeBubbleDependencies } from "./mergeCommandContract.js";
import {
  loadMergeBubbleDependencyDefaults,
  type MergeBubbleDependencyDefaults
} from "./mergeCommandDefaults.js";

export interface ResolvedMergeCommandDependencies {
  runGit: MergeBubbleDependencyDefaults["runGit"];
  resolveBubbleById: MergeBubbleDependencyDefaults["resolveBubbleById"];
  readStateSnapshot: MergeBubbleDependencyDefaults["readStateSnapshot"];
  writeStateSnapshot: MergeBubbleDependencyDefaults["writeStateSnapshot"];
  branchExists: MergeBubbleDependencyDefaults["branchExists"];
  terminateBubbleTmuxSession:
    MergeBubbleDependencyDefaults["terminateBubbleTmuxSession"];
  removeRuntimeSession: MergeBubbleDependencyDefaults["removeRuntimeSession"];
  cleanupWorktreeWorkspace:
    MergeBubbleDependencyDefaults["cleanupWorktreeWorkspace"];
  ensureBubbleInstanceIdForMutation:
    MergeBubbleDependencyDefaults["ensureBubbleInstanceIdForMutation"];
  emitBubbleLifecycleEventBestEffort:
    MergeBubbleDependencyDefaults["emitBubbleLifecycleEventBestEffort"];
  readRemotePointer: MergeBubbleDependencyDefaults["readRemotePointer"];
  resolveRemoteBubbleStatusTarget:
    MergeBubbleDependencyDefaults["resolveRemoteBubbleStatusTarget"];
  executeRemoteBubbleMergeCommand:
    MergeBubbleDependencyDefaults["executeRemoteBubbleMergeCommand"];
  executeRemoteBubbleMergeCleanupCommand:
    MergeBubbleDependencyDefaults["executeRemoteBubbleMergeCleanupCommand"];
  importRemoteBubbleCommitContinuity:
    MergeBubbleDependencyDefaults["importRemoteBubbleCommitContinuity"];
  renamePath: MergeBubbleDependencyDefaults["renamePath"];
  writeTextFile: MergeBubbleDependencyDefaults["writeTextFile"];
}

export async function resolveMergeCommandDependencies(
  dependencies: MergeBubbleDependencies = {}
): Promise<ResolvedMergeCommandDependencies> {
  const mergeBubbleDependencyDefaults = await loadMergeBubbleDependencyDefaults();
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
      ?? mergeBubbleDependencyDefaults.emitBubbleLifecycleEventBestEffort,
    readRemotePointer:
      dependencies.readRemotePointer ?? mergeBubbleDependencyDefaults.readRemotePointer,
    resolveRemoteBubbleStatusTarget:
      dependencies.resolveRemoteBubbleStatusTarget
      ?? mergeBubbleDependencyDefaults.resolveRemoteBubbleStatusTarget,
    executeRemoteBubbleMergeCommand:
      dependencies.executeRemoteBubbleMergeCommand
      ?? mergeBubbleDependencyDefaults.executeRemoteBubbleMergeCommand,
    executeRemoteBubbleMergeCleanupCommand:
      dependencies.executeRemoteBubbleMergeCleanupCommand
      ?? mergeBubbleDependencyDefaults.executeRemoteBubbleMergeCleanupCommand,
    importRemoteBubbleCommitContinuity:
      dependencies.importRemoteBubbleCommitContinuity
      ?? mergeBubbleDependencyDefaults.importRemoteBubbleCommitContinuity,
    renamePath: dependencies.renamePath ?? mergeBubbleDependencyDefaults.renamePath,
    writeTextFile:
      dependencies.writeTextFile ?? mergeBubbleDependencyDefaults.writeTextFile
  };
}
