import { realpathSync } from "node:fs";
import { resolve } from "node:path";

export const remoteDeleteModeEnvVar = "PAIRFLOW_REMOTE_DELETE_MODE";
export const remoteDeleteWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_DELETE_WORKSPACE_ROOT";
export const remoteDeleteModeInnerRemoteExecution = "inner_remote_execution";

export interface RemoteDeleteExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export function canonicalizeDeleteExecutionPath(pathValue: string): string {
  const absolutePath = resolve(pathValue);
  try {
    return realpathSync.native(absolutePath);
  } catch {
    return absolutePath;
  }
}

export function resolveRemoteDeleteExecutionContextFromEnv():
  | RemoteDeleteExecutionContext
  | undefined {
  const remoteDeleteMode = process.env[remoteDeleteModeEnvVar]?.trim();
  const workspaceRoot = process.env[remoteDeleteWorkspaceRootEnvVar]?.trim();

  if (
    workspaceRoot !== undefined
    && workspaceRoot.length > 0
    && (remoteDeleteMode === undefined || remoteDeleteMode.length === 0)
  ) {
    throw new Error(
      "Remote inner delete workspace authority was provided without the matching remote execution mode."
    );
  }

  if (remoteDeleteMode === undefined || remoteDeleteMode.length === 0) {
    return undefined;
  }
  if (remoteDeleteMode !== remoteDeleteModeInnerRemoteExecution) {
    throw new Error(
      `Remote inner delete mode env var contains an unsupported execution mode: '${remoteDeleteMode}'.`
    );
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw new Error(
      "Remote inner delete requires explicit clone-root workspace authority."
    );
  }

  return {
    kind: "remote_clone",
    workspaceRoot: canonicalizeDeleteExecutionPath(workspaceRoot)
  };
}
