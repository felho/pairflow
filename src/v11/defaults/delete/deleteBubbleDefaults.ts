import { createArchiveSnapshot } from "../../infrastructure/artifact/archive/archiveSnapshot.js";
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
import { terminateBubbleTmuxSession } from "../tmux/tmuxSessionDefaults.js";
import { cleanupWorktreeWorkspace } from "../worktree/worktreeWorkspaceDefaults.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import { buildBubbleTmuxSessionName } from "../../shared/bubble/tmuxSessionName.js";

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
  upsertDeletedArchiveIndexEntry
} as const;
