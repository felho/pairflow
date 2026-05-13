import type {
  DeleteBubbleArtifacts
} from "../../../../../contracts/deleteBubble.js";
import type {
  DeleteBubbleDependencies,
  DeleteBubbleDefaultDependencies
} from "../../deleteBubbleContract.js";

export interface ResolvedDeleteDependencies {
  buildBubbleTmuxSessionName: DeleteBubbleDefaultDependencies["buildBubbleTmuxSessionName"];
  resolveBubbleById: DeleteBubbleDefaultDependencies["resolveBubbleById"];
  branchExists: DeleteBubbleDependencies["branchExists"];
  pathExists: DeleteBubbleDependencies["pathExists"];
  runTmux: DeleteBubbleDefaultDependencies["runTmux"];
  readRuntimeSessionsRegistry: DeleteBubbleDefaultDependencies["readRuntimeSessionsRegistry"];
  terminateBubbleTmuxSession: DeleteBubbleDefaultDependencies["terminateBubbleTmuxSession"];
  removeRuntimeSession: DeleteBubbleDefaultDependencies["removeRuntimeSession"];
  cleanupWorktreeWorkspace: DeleteBubbleDefaultDependencies["cleanupWorktreeWorkspace"];
  removeBubbleDirectory: (path: string) => Promise<void>;
  removeWatchdogPaneActivity: DeleteBubbleDependencies["removeWatchdogPaneActivity"];
  stopBubble: DeleteBubbleDefaultDependencies["stopBubble"];
  createArchiveSnapshot: DeleteBubbleDefaultDependencies["createArchiveSnapshot"];
  upsertDeletedArchiveIndexEntry: DeleteBubbleDefaultDependencies["upsertDeletedArchiveIndexEntry"];
  readRemotePointer: DeleteBubbleDependencies["readRemotePointer"];
  resolveRemoteBubbleStatusTarget: DeleteBubbleDefaultDependencies["resolveRemoteBubbleStatusTarget"];
  executeRemoteBubbleDeleteCommand: DeleteBubbleDependencies["executeRemoteBubbleDeleteCommand"];
  ensureBubbleInstanceIdForMutation: DeleteBubbleDefaultDependencies["ensureBubbleInstanceIdForMutation"];
  readStateSnapshot: DeleteBubbleDefaultDependencies["readStateSnapshot"];
  TmuxCommandError: DeleteBubbleDefaultDependencies["TmuxCommandError"];
  archiveLocksDir: string;
}

export type ResolvedBubble = Awaited<
  ReturnType<DeleteBubbleDefaultDependencies["resolveBubbleById"]>
>;

export interface DeleteResolution {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
}

export interface DeleteExecutionContext {
  bubbleInstanceId: string;
  metricsRound: number | null;
  requiresPreDeleteStop: boolean;
}

export interface DeleteRuntimeCleanupResult {
  tmuxSessionTerminated: boolean;
  runtimeSessionRemoved: boolean;
}

export interface DeleteWorkspaceCleanupResult {
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}
