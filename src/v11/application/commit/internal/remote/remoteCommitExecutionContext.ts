import {
  canonicalizeRemoteExecutionPath,
  resolveRemoteCloneExecutionContextFromEnv,
  type RemoteExecutionContextEnvFailure
} from "../../../remote/remoteExecutionContextEnv.js";

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

export const canonicalizeCommitExecutionPath = canonicalizeRemoteExecutionPath;

function toRemoteCommitExecutionContextError(
  failure: RemoteExecutionContextEnvFailure
): Error {
  if (failure.kind === "workspace_without_mode") {
    return new RemoteCommitExecutionContextError({
      code: "REMOTE_COMMIT_CONTEXT_MODE_REQUIRED",
      message:
        "Remote inner commit workspace authority was provided without the matching remote execution mode.",
      context: {
        command_name: "commit",
        ...(failure.modeValue !== undefined
          ? { remote_commit_mode: failure.modeValue }
          : {}),
        ...(failure.workspaceRoot !== undefined
          ? { remote_workspace_root: failure.workspaceRoot }
          : {})
      }
    });
  }

  if (failure.kind === "unsupported_mode") {
    return new RemoteCommitExecutionContextError({
      code: "REMOTE_COMMIT_CONTEXT_MODE_INVALID",
      message:
        "Remote inner commit mode env var contains an unsupported execution mode.",
      context: {
        command_name: "commit",
        remote_commit_mode: failure.modeValue,
        ...(failure.workspaceRoot !== undefined
          ? { remote_workspace_root: failure.workspaceRoot }
          : {})
      }
    });
  }

  return new RemoteCommitExecutionContextError({
    code: "REMOTE_COMMIT_CONTEXT_WORKSPACE_ROOT_REQUIRED",
    message:
      "Remote inner commit requires explicit clone-root workspace authority.",
    context: {
      command_name: "commit",
      remote_commit_mode: failure.modeValue
    }
  });
}

export function resolveRemoteCommitExecutionContextFromEnv():
  | RemoteCommitExecutionContext
  | undefined {
  return resolveRemoteCloneExecutionContextFromEnv({
    modeEnvVar: remoteCommitModeEnvVar,
    workspaceRootEnvVar: remoteCommitWorkspaceRootEnvVar,
    expectedMode: remoteCommitModeInnerRemoteExecution,
    workspaceWithoutExpectedMode: "missing_or_mismatch",
    canonicalizeWorkspaceRoot: canonicalizeCommitExecutionPath,
    toError: toRemoteCommitExecutionContextError
  });
}
