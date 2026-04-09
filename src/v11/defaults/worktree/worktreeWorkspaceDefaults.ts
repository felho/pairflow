import { cleanupWorktreeWorkspace as cleanupWorktreeWorkspaceCanonical } from "../../infrastructure/workspace/worktreeManager.js";
import type { CleanupWorktreeWorkspacePort } from "../../shared/ports/worktreeWorkspace.js";

export const cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort = async (
  ...args
) => cleanupWorktreeWorkspaceCanonical(...args);
