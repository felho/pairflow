import { createArchiveSnapshot } from "../../v11/infrastructure/artifact/archive/archiveSnapshot.js";
import { upsertDeletedArchiveIndexEntry } from "../../v11/infrastructure/artifact/archive/archiveIndex.js";
import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession
} from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  buildBubbleTmuxSessionName,
  TmuxCommandError,
  runTmux,
  terminateBubbleTmuxSession
} from "../../v11/infrastructure/channel/tmux/tmuxManager.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { cleanupWorktreeWorkspace } from "../../v11/infrastructure/workspace/worktreeManager.js";
import { pathExists } from "../../v11/infrastructure/foundation/fs/pathExists.js";
import { branchExists } from "../../v11/infrastructure/workspace/git.js";

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
