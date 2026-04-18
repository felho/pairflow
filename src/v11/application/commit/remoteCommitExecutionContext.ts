import { realpathSync } from "node:fs";
import { resolve } from "node:path";

export const remoteCommitModeEnvVar = "PAIRFLOW_REMOTE_COMMIT_MODE";
export const remoteCommitWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT";
export const remoteCommitModeInnerRemoteExecution = "inner_remote_execution";

export interface RemoteCommitExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export class RemoteCommitExecutionContextError extends Error {
  public readonly code:
    | "REMOTE_COMMIT_CONTEXT_MODE_REQUIRED"
    | "REMOTE_COMMIT_CONTEXT_MODE_INVALID"
    | "REMOTE_COMMIT_CONTEXT_WORKSPACE_ROOT_REQUIRED";
  public readonly context: {
    command_name: "commit";
    remote_commit_mode?: string;
    remote_workspace_root?: string;
  };

  public constructor(input: {
    code:
      | "REMOTE_COMMIT_CONTEXT_MODE_REQUIRED"
      | "REMOTE_COMMIT_CONTEXT_MODE_INVALID"
      | "REMOTE_COMMIT_CONTEXT_WORKSPACE_ROOT_REQUIRED";
    message: string;
    context: {
      command_name: "commit";
      remote_commit_mode?: string;
      remote_workspace_root?: string;
    };
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteCommitExecutionContextError";
    this.code = input.code;
    this.context = input.context;
  }
}

export function canonicalizeCommitExecutionPath(pathValue: string): string {
  const absolutePath = resolve(pathValue);
  try {
    return realpathSync.native(absolutePath);
  } catch {
    return absolutePath;
  }
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
    throw new RemoteCommitExecutionContextError({
      code: "REMOTE_COMMIT_CONTEXT_MODE_REQUIRED",
      message:
        "Remote inner commit workspace authority was provided without the matching remote execution mode.",
      context: {
        command_name: "commit",
        ...(remoteCommitMode !== undefined
          ? { remote_commit_mode: remoteCommitMode }
          : {}),
        remote_workspace_root: workspaceRoot
      }
    });
  }

  if (remoteCommitMode === undefined || remoteCommitMode.length === 0) {
    return undefined;
  }
  if (remoteCommitMode !== remoteCommitModeInnerRemoteExecution) {
    throw new RemoteCommitExecutionContextError({
      code: "REMOTE_COMMIT_CONTEXT_MODE_INVALID",
      message:
        "Remote inner commit mode env var contains an unsupported execution mode.",
      context: {
        command_name: "commit",
        remote_commit_mode: remoteCommitMode,
        ...(workspaceRoot !== undefined
          ? { remote_workspace_root: workspaceRoot }
          : {})
      }
    });
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw new RemoteCommitExecutionContextError({
      code: "REMOTE_COMMIT_CONTEXT_WORKSPACE_ROOT_REQUIRED",
      message:
        "Remote inner commit requires explicit clone-root workspace authority.",
      context: {
        command_name: "commit",
        remote_commit_mode: remoteCommitMode
      }
    });
  }

  return {
    kind: "remote_clone",
    workspaceRoot: canonicalizeCommitExecutionPath(workspaceRoot)
  };
}
