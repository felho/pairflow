import {
  createArchiveSnapshot
} from "../../infrastructure/artifact/archive/archiveSnapshot.js";
import { upsertDeletedArchiveIndexEntry as upsertDeletedArchiveIndexEntryImpl } from "../../infrastructure/artifact/archive/archiveIndex.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  TmuxCommandError,
  runTmux,
  terminateBubbleTmuxSession
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import { buildBubbleTmuxSessionName } from "../../shared/bubble/tmuxSessionName.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { cleanupWorktreeWorkspace } from "../../infrastructure/workspace/worktreeManager.js";
import { pathExists } from "../../infrastructure/foundation/fs/pathExists.js";
import { branchExists } from "../../infrastructure/workspace/git.js";

export const deleteBubbleDependencyDefaults = {
  buildBubbleTmuxSessionName,
  branchExists,
  cleanupWorktreeWorkspace,
  createArchiveSnapshot,
  ensureBubbleInstanceIdForMutation,
  pathExists,
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  runTmux,
  TmuxCommandError,
  terminateBubbleTmuxSession,
  upsertDeletedArchiveIndexEntry: upsertDeletedArchiveIndexEntryImpl
} as const;
