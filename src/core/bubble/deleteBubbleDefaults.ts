import { createArchiveSnapshot } from "../archive/archiveSnapshot.js";
import { upsertDeletedArchiveIndexEntry } from "../archive/archiveIndex.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession
} from "../runtime/sessionsRegistry.js";
import {
  runTmux,
  terminateBubbleTmuxSession
} from "../runtime/tmuxManager.js";
import { cleanupWorktreeWorkspace } from "../workspace/worktreeManager.js";
import { pathExists } from "../util/pathExists.js";
import { branchExists } from "../workspace/git.js";

export const deleteBubbleDependencyDefaults = {
  branchExists,
  cleanupWorktreeWorkspace,
  createArchiveSnapshot,
  pathExists,
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  resolveBubbleById,
  runTmux,
  terminateBubbleTmuxSession,
  upsertDeletedArchiveIndexEntry
} as const;
