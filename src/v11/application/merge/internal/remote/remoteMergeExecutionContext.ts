import { realpathSync } from "node:fs";
import { resolve } from "node:path";

import { createBubbleMergeError } from "../error/mergeCommandErrorRuntime.js";

export const remoteMergeModeEnvVar = "PAIRFLOW_REMOTE_MERGE_MODE";
export const remoteMergeWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_MERGE_WORKSPACE_ROOT";
export const remoteMergeModeInnerRemoteExecution = "inner_remote_execution";
const MERGE_REMOTE_MODE_REQUIRED =
  "MERGE_REMOTE_EXECUTION_MODE_REQUIRED";
const MERGE_REMOTE_MODE_UNSUPPORTED =
  "MERGE_REMOTE_EXECUTION_MODE_UNSUPPORTED";
const MERGE_REMOTE_WORKSPACE_ROOT_REQUIRED =
  "MERGE_REMOTE_WORKSPACE_ROOT_REQUIRED";

export interface RemoteMergeExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export function canonicalizeMergeExecutionPath(pathValue: string): string {
  const absolutePath = resolve(pathValue);
  try {
    return realpathSync.native(absolutePath);
  } catch {
    return absolutePath;
  }
}

export function resolveRemoteMergeExecutionContextFromEnv():
  | RemoteMergeExecutionContext
  | undefined {
  const remoteMergeMode = process.env[remoteMergeModeEnvVar]?.trim();
  const workspaceRoot = process.env[remoteMergeWorkspaceRootEnvVar]?.trim();

  if (
    workspaceRoot !== undefined
    && workspaceRoot.length > 0
    && remoteMergeMode !== remoteMergeModeInnerRemoteExecution
  ) {
    throw createBubbleMergeError({
      reasonCode: MERGE_REMOTE_MODE_REQUIRED,
      message:
        "Remote inner merge workspace authority was provided without the matching remote execution mode.",
      context: {
        remote_merge_mode: remoteMergeMode ?? "missing",
        remote_workspace_root: workspaceRoot
      }
    });
  }

  if (remoteMergeMode === undefined || remoteMergeMode.length === 0) {
    return undefined;
  }
  if (remoteMergeMode !== remoteMergeModeInnerRemoteExecution) {
    throw createBubbleMergeError({
      reasonCode: MERGE_REMOTE_MODE_UNSUPPORTED,
      message:
        `Remote inner merge mode env var contains an unsupported execution mode: '${remoteMergeMode}'.`,
      context: {
        remote_merge_mode: remoteMergeMode
      }
    });
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw createBubbleMergeError({
      reasonCode: MERGE_REMOTE_WORKSPACE_ROOT_REQUIRED,
      message:
        "Remote inner merge requires explicit clone-root workspace authority.",
      context: {
        remote_merge_mode: remoteMergeModeInnerRemoteExecution
      }
    });
  }

  return {
    kind: "remote_clone",
    workspaceRoot: canonicalizeMergeExecutionPath(workspaceRoot)
  };
}
