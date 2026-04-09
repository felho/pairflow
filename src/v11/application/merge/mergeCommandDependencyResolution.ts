import type { MergeBubbleDependencies } from "./mergeCommandContract.js";

interface MergeBubbleDependencyDefaults {
  runGit: NonNullable<MergeBubbleDependencies["runGit"]>;
  resolveBubbleById: NonNullable<MergeBubbleDependencies["resolveBubbleById"]>;
  readStateSnapshot: NonNullable<MergeBubbleDependencies["readStateSnapshot"]>;
  writeStateSnapshot: NonNullable<MergeBubbleDependencies["writeStateSnapshot"]>;
  branchExists: NonNullable<MergeBubbleDependencies["branchExists"]>;
  terminateBubbleTmuxSession:
    NonNullable<MergeBubbleDependencies["terminateBubbleTmuxSession"]>;
  removeRuntimeSession:
    NonNullable<MergeBubbleDependencies["removeRuntimeSession"]>;
  cleanupWorktreeWorkspace:
    NonNullable<MergeBubbleDependencies["cleanupWorktreeWorkspace"]>;
  ensureBubbleInstanceIdForMutation:
    NonNullable<MergeBubbleDependencies["ensureBubbleInstanceIdForMutation"]>;
  emitBubbleLifecycleEventBestEffort:
    NonNullable<MergeBubbleDependencies["emitBubbleLifecycleEventBestEffort"]>;
}

let mergeBubbleDependencyDefaultsPromise:
  | Promise<MergeBubbleDependencyDefaults>
  | undefined;

async function loadMergeBubbleDependencyDefaults(): Promise<
  MergeBubbleDependencyDefaults
> {
  mergeBubbleDependencyDefaultsPromise ??= import(
    "../../../core/bubble/mergeBubbleDefaults.js"
  ).then(({ mergeBubbleDependencyDefaults }) => ({
    runGit: mergeBubbleDependencyDefaults.runGit,
    resolveBubbleById: mergeBubbleDependencyDefaults.resolveBubbleById,
    readStateSnapshot: mergeBubbleDependencyDefaults.readStateSnapshot,
    writeStateSnapshot: mergeBubbleDependencyDefaults.writeStateSnapshot,
    branchExists: mergeBubbleDependencyDefaults.branchExists,
    terminateBubbleTmuxSession:
      mergeBubbleDependencyDefaults.terminateBubbleTmuxSession,
    removeRuntimeSession: mergeBubbleDependencyDefaults.removeRuntimeSession,
    cleanupWorktreeWorkspace:
      mergeBubbleDependencyDefaults.cleanupWorktreeWorkspace,
    ensureBubbleInstanceIdForMutation:
      mergeBubbleDependencyDefaults.ensureBubbleInstanceIdForMutation,
    emitBubbleLifecycleEventBestEffort:
      mergeBubbleDependencyDefaults.emitBubbleLifecycleEventBestEffort
  }));
  return mergeBubbleDependencyDefaultsPromise;
}

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
