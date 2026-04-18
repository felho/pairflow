import { resolve } from "node:path";

export const remoteCommitModeEnvVar = "PAIRFLOW_REMOTE_COMMIT_MODE";
export const remoteCommitWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT";
export const remoteCommitModeInnerRemoteExecution = "inner_remote_execution";

export interface RemoteCommitExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export function resolveRemoteCommitExecutionContextFromEnv():
  | RemoteCommitExecutionContext
  | undefined {
  const remoteCommitMode = process.env[remoteCommitModeEnvVar]?.trim();
  const workspaceRoot = process.env[remoteCommitWorkspaceRootEnvVar]?.trim();

  if (
    workspaceRoot !== undefined
    && workspaceRoot.length > 0
    && remoteCommitMode !== remoteCommitModeInnerRemoteExecution
  ) {
    throw new Error(
      "Remote inner commit workspace authority was provided without the matching remote execution mode."
    );
  }

  if (remoteCommitMode === undefined || remoteCommitMode.length === 0) {
    return undefined;
  }
  if (remoteCommitMode !== remoteCommitModeInnerRemoteExecution) {
    throw new Error(
      "Remote inner commit mode env var contains an unsupported execution mode."
    );
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw new Error(
      "Remote inner commit requires explicit clone-root workspace authority."
    );
  }

  return {
    kind: "remote_clone",
    workspaceRoot: resolve(workspaceRoot)
  };
}
