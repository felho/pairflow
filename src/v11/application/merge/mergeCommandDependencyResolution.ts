import type { MergeBubbleDependencies } from "./mergeCommandContract.js";
import type * as CoreMergeBubbleDefaults from "../../../core/bubble/mergeBubbleDefaults.js";

let mergeBubbleDependencyDefaultsPromise:
  | Promise<typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults>
  | undefined;

async function loadMergeBubbleDependencyDefaults(): Promise<
  typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults
> {
  mergeBubbleDependencyDefaultsPromise ??= import(
    "../../../core/bubble/mergeBubbleDefaults.js"
  ).then(({ mergeBubbleDependencyDefaults }) => mergeBubbleDependencyDefaults);
  return mergeBubbleDependencyDefaultsPromise;
}

export interface ResolvedMergeCommandDependencies {
  runGit: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.runGit;
  resolveBubbleById: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.resolveBubbleById;
  readStateSnapshot: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.readStateSnapshot;
  writeStateSnapshot: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.writeStateSnapshot;
  branchExists: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.branchExists;
  terminateBubbleTmuxSession: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.terminateBubbleTmuxSession;
  removeRuntimeSession: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.removeRuntimeSession;
  cleanupWorktreeWorkspace: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.cleanupWorktreeWorkspace;
  ensureBubbleInstanceIdForMutation: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.ensureBubbleInstanceIdForMutation;
  emitBubbleLifecycleEventBestEffort: typeof CoreMergeBubbleDefaults.mergeBubbleDependencyDefaults.emitBubbleLifecycleEventBestEffort;
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
      ?? mergeBubbleDependencyDefaults.emitBubbleLifecycleEventBestEffort
  };
}
