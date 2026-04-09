import { readStateSnapshot, writeStateSnapshot } from "../../shared/state/stateStoreDefaults.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
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
  mergeBubbleDependencyDefaultsPromise ??= Promise.all([
    import("../../infrastructure/workspace/git.js"),
    import("../../infrastructure/executor/workspace/bubbleLookup.js"),
    import("../../infrastructure/workspace/worktreeManager.js"),
    import("../../infrastructure/channel/tmux/tmuxManager.js"),
    import("../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js"),
    import("../../infrastructure/artifact/bubble/bubbleInstanceId.js")
  ]).then(
    ([
      { runGit, branchExists },
      { resolveBubbleById },
      { cleanupWorktreeWorkspace },
      { terminateBubbleTmuxSession },
      { removeRuntimeSession },
      { ensureBubbleInstanceIdForMutation }
    ]) => ({
      runGit,
      resolveBubbleById,
      readStateSnapshot,
      writeStateSnapshot,
      branchExists,
      terminateBubbleTmuxSession,
      removeRuntimeSession,
      cleanupWorktreeWorkspace,
      ensureBubbleInstanceIdForMutation,
      emitBubbleLifecycleEventBestEffort
    })
  );
  return mergeBubbleDependencyDefaultsPromise;
}
