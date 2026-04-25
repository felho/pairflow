import { mergeBubbleDependencyDefaults as mergeBubbleDependencyDefaultsV11 } from "../../defaults/merge/mergeCommandDefaults.js";
import type { MergeBubbleDependencies } from "./mergeCommandContract.js";

export interface MergeBubbleDependencyDefaults {
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
  readRemotePointer: NonNullable<MergeBubbleDependencies["readRemotePointer"]>;
  resolveRemoteBubbleStatusTarget:
    NonNullable<MergeBubbleDependencies["resolveRemoteBubbleStatusTarget"]>;
  executeRemoteBubbleMergeCommand:
    NonNullable<MergeBubbleDependencies["executeRemoteBubbleMergeCommand"]>;
  executeRemoteBubbleMergeCleanupCommand:
    NonNullable<MergeBubbleDependencies["executeRemoteBubbleMergeCleanupCommand"]>;
  importRemoteBubbleCommitContinuity:
    NonNullable<MergeBubbleDependencies["importRemoteBubbleCommitContinuity"]>;
  renamePath: NonNullable<MergeBubbleDependencies["renamePath"]>;
  writeTextFile: NonNullable<MergeBubbleDependencies["writeTextFile"]>;
}

let mergeBubbleDependencyDefaultsPromise:
  | Promise<MergeBubbleDependencyDefaults>
  | undefined;

export async function loadMergeBubbleDependencyDefaults(): Promise<
  MergeBubbleDependencyDefaults
> {
  mergeBubbleDependencyDefaultsPromise ??= Promise.resolve(
    mergeBubbleDependencyDefaultsV11
  );
  return mergeBubbleDependencyDefaultsPromise;
}
