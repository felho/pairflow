import { mergeBubbleDependencyDefaults as mergeBubbleDependencyDefaultsCore } from "../../../core/bubble/mergeBubbleDefaults.js";
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
}

let mergeBubbleDependencyDefaultsPromise:
  | Promise<MergeBubbleDependencyDefaults>
  | undefined;

export async function loadMergeBubbleDependencyDefaults(): Promise<
  MergeBubbleDependencyDefaults
> {
  mergeBubbleDependencyDefaultsPromise ??= Promise.resolve(
    mergeBubbleDependencyDefaultsCore
  );
  return mergeBubbleDependencyDefaultsPromise;
}
