import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { DeleteBubbleDependencies } from "../../deleteBubbleContract.js";
import { inferBubbleStartedAtFromInstanceId } from "../../../../shared/bubble/bubbleInstanceId.js";
import type { ResolvedDeleteDependencies } from "../types/deleteTypes.js";

export function inferCreatedAtFromBubbleInstanceId(
  bubbleInstanceId: string
): string | null {
  return inferBubbleStartedAtFromInstanceId(bubbleInstanceId);
}

function getErrorCode(error: unknown): unknown {
  if (typeof error !== "object") {
    return undefined;
  }
  if (error === null) {
    return undefined;
  }
  if (!("code" in error)) {
    return undefined;
  }
  return error.code;
}

export async function removeBubbleDirectory(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true });
  } catch (error) {
    if (getErrorCode(error) === "ENOENT") {
      return;
    }
    throw error;
  }
}

export function resolveDeleteDependencies(
  dependencies: DeleteBubbleDependencies
): ResolvedDeleteDependencies {
  return {
    buildBubbleTmuxSessionName: dependencies.buildBubbleTmuxSessionName,
    resolveBubbleById: dependencies.resolveBubbleById,
    branchExists: dependencies.branchExists,
    pathExists: dependencies.pathExists,
    runTmux: dependencies.runTmux,
    readRuntimeSessionsRegistry: dependencies.readRuntimeSessionsRegistry,
    terminateBubbleTmuxSession: dependencies.terminateBubbleTmuxSession,
    removeRuntimeSession: dependencies.removeRuntimeSession,
    cleanupWorktreeWorkspace: dependencies.cleanupWorktreeWorkspace,
    removeBubbleDirectory:
      dependencies.removeBubbleDirectory ?? removeBubbleDirectory,
    removeWatchdogPaneActivity: dependencies.removeWatchdogPaneActivity,
    stopBubble: dependencies.stopBubble,
    createArchiveSnapshot: dependencies.createArchiveSnapshot,
    upsertDeletedArchiveIndexEntry: dependencies.upsertDeletedArchiveIndexEntry,
    readRemotePointer: dependencies.readRemotePointer,
    resolveRemoteBubbleStatusTarget: dependencies.resolveRemoteBubbleStatusTarget,
    executeRemoteBubbleDeleteCommand: dependencies.executeRemoteBubbleDeleteCommand,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation,
    readStateSnapshot: dependencies.readStateSnapshot,
    TmuxCommandError: dependencies.TmuxCommandError,
    archiveLocksDir: join(homedir(), ".pairflow", "locks")
  };
}
