import { createArchiveSnapshot } from "../../infrastructure/artifact/archive/archiveSnapshot.js";
import { readRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { executeRemoteBubbleDeleteCommand } from "../../infrastructure/executor/ssh/sshBubbleDeleteCommand.js";
import { upsertDeletedArchiveIndexEntry } from "../../infrastructure/artifact/archive/archiveIndex.js";
import { pathExists } from "../../infrastructure/foundation/fs/pathExists.js";
import {
  TmuxCommandError,
  runTmux
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { branchExists } from "../../infrastructure/workspace/git.js";
import { readRuntimeSessionsRegistry, removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { stopBubbleCommandOrchestration } from "../../application/stop/stopCommandOrchestration.js";
import { stopBubbleDependencyDefaults } from "../stop/stopCommandDefaults.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { cleanupWorktreeWorkspace } from "../../infrastructure/workspace/worktreeManager.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
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
