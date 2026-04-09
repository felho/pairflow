import { createArchiveSnapshot } from "../../v11/infrastructure/artifact/archive/archiveSnapshot.js";
import { upsertDeletedArchiveIndexEntry } from "../../v11/infrastructure/artifact/archive/archiveIndex.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession
} from "../runtime/sessionsRegistry.js";
import {
  buildBubbleTmuxSessionName,
  TmuxCommandError,
  runTmux,
  terminateBubbleTmuxSession
} from "../runtime/tmuxManager.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { cleanupWorktreeWorkspace } from "../workspace/worktreeManager.js";
import { pathExists } from "../util/pathExists.js";
import { branchExists } from "../workspace/git.js";

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
