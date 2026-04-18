import { realpathSync } from "node:fs";
import { resolve } from "node:path";

export const remoteMergeModeEnvVar = "PAIRFLOW_REMOTE_MERGE_MODE";
export const remoteMergeWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_MERGE_WORKSPACE_ROOT";
export const remoteMergeModeInnerRemoteExecution = "inner_remote_execution";

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
    throw new Error(
      "Remote inner merge workspace authority was provided without the matching remote execution mode."
    );
  }

  if (remoteMergeMode === undefined || remoteMergeMode.length === 0) {
    return undefined;
  }
  if (remoteMergeMode !== remoteMergeModeInnerRemoteExecution) {
    throw new Error(
      "Remote inner merge mode env var contains an unsupported execution mode."
    );
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw new Error(
      "Remote inner merge requires explicit clone-root workspace authority."
    );
  }

  return {
    kind: "remote_clone",
    workspaceRoot: canonicalizeMergeExecutionPath(workspaceRoot)
  };
}
