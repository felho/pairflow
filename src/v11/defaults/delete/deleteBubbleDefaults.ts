import { createArchiveSnapshot } from "../../infrastructure/artifact/archive/archiveSnapshot.js";
import { readRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { executeRemoteBubbleDeleteCommand } from "../../infrastructure/executor/ssh/sshBubbleDeleteCommand.js";
import { upsertDeletedArchiveIndexEntry } from "../../infrastructure/artifact/archive/archiveIndex.js";
import { pathExists } from "../../infrastructure/foundation/fs/pathExists.js";
import {
  TmuxCommandError,
  runTmux
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDefaults.js";
import { branchExists } from "../git/gitDefaults.js";
import { readRuntimeSessionsRegistry, removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { stopBubbleCommandOrchestration } from "../../application/stop/stopCommandOrchestration.js";
import { stopBubbleDependencyDefaults } from "../stop/stopCommandDefaults.js";
import { terminateBubbleTmuxSession } from "../tmux/tmuxSessionDefaults.js";
import { cleanupWorktreeWorkspace } from "../worktree/worktreeWorkspaceDefaults.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { buildBubbleTmuxSessionName } from "../../shared/bubble/tmuxSessionName.js";
import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";
import { removeWatchdogPaneActivity } from "../watchdog/watchdogPaneActivityDefaults.js";
import type { DeleteBubbleDefaultDependencies } from "../../application/delete/deleteBubbleSupport.js";

const stopBubble: typeof stopBubbleCommandOrchestration = (input, dependencies = {}) =>
  stopBubbleCommandOrchestration(input, {
    ...stopBubbleDependencyDefaults,
    ...dependencies
  });

export const deleteBubbleDependencyDefaults = {
  buildBubbleTmuxSessionName,
  branchExists,
  cleanupWorktreeWorkspace,
  createArchiveSnapshot,
  executeRemoteBubbleDeleteCommand,
  ensureBubbleInstanceIdForMutation,
  pathExists,
  readRemotePointer,
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  removeWatchdogPaneActivity,
  removeRuntimeSession,
  resolveRemoteBubbleStatusTarget:
    statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget,
  resolveBubbleById,
  runTmux,
  stopBubble,
  TmuxCommandError,
  terminateBubbleTmuxSession,
  upsertDeletedArchiveIndexEntry
} as const satisfies DeleteBubbleDefaultDependencies;
