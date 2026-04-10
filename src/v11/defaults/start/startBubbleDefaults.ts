import {
  terminateBubbleTmuxSession as terminateBubbleTmuxSessionCanonical,
  launchBubbleTmuxSession as launchBubbleTmuxSessionCanonical
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import {
  claimRuntimeSession as claimRuntimeSessionCanonical,
  removeRuntimeSession as removeRuntimeSessionCanonical
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  cleanupWorktreeWorkspace as cleanupWorktreeWorkspaceCanonical,
  bootstrapWorktreeWorkspace as bootstrapWorktreeWorkspaceCanonical
} from "../../infrastructure/workspace/worktreeManager.js";
import { writeStateSnapshot as writeStateSnapshotCanonical } from "../../infrastructure/state/stateStore.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort
} from "../../shared/ports/worktreeWorkspace.js";
import type {
  ClaimRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type {
  LaunchBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";

export interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort;
  launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  claimRuntimeSession: ClaimRuntimeSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  writeStateSnapshot: WriteStateSnapshotPort;
}

export const bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort =
  bootstrapWorktreeWorkspaceCanonical;

export const launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort =
  launchBubbleTmuxSessionCanonical;

export const claimRuntimeSession: ClaimRuntimeSessionPort =
  claimRuntimeSessionCanonical;

export const startBubbleDependencyDefaults: StartBubbleDependencyDefaults = {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace: cleanupWorktreeWorkspaceCanonical,
  launchBubbleTmuxSession,
  terminateBubbleTmuxSession: terminateBubbleTmuxSessionCanonical,
  claimRuntimeSession,
  removeRuntimeSession: removeRuntimeSessionCanonical,
  writeStateSnapshot: writeStateSnapshotCanonical
};
