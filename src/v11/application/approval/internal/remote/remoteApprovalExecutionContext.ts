import {
  canonicalizeRemoteExecutionPath,
  resolveRemoteCloneExecutionContextFromEnv,
  type RemoteExecutionContextEnvFailure
} from "../../../remote/remoteExecutionContextEnv.js";

export const remoteApprovalModeEnvVar = "PAIRFLOW_REMOTE_APPROVAL_MODE";
export const remoteApprovalWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_APPROVAL_WORKSPACE_ROOT";
export const remoteApprovalModeInnerRemoteExecution = "inner_remote_execution";

export interface RemoteApprovalExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export class RemoteApprovalExecutionContextError extends Error {
  public readonly code:
    | "REMOTE_APPROVAL_CONTEXT_MODE_REQUIRED"
    | "REMOTE_APPROVAL_CONTEXT_MODE_INVALID"
    | "REMOTE_APPROVAL_CONTEXT_WORKSPACE_ROOT_REQUIRED";
  public readonly context: {
    command_name: "approval";
    remote_approval_mode?: string;
    remote_workspace_root?: string;
  };

  public constructor(input: {
    code:
      | "REMOTE_APPROVAL_CONTEXT_MODE_REQUIRED"
      | "REMOTE_APPROVAL_CONTEXT_MODE_INVALID"
      | "REMOTE_APPROVAL_CONTEXT_WORKSPACE_ROOT_REQUIRED";
    message: string;
    context: {
      command_name: "approval";
      remote_approval_mode?: string;
      remote_workspace_root?: string;
    };
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteApprovalExecutionContextError";
    this.code = input.code;
    this.context = input.context;
  }
}

export const canonicalizeApprovalExecutionPath = canonicalizeRemoteExecutionPath;

function toRemoteApprovalExecutionContextError(
  failure: RemoteExecutionContextEnvFailure
): Error {
  if (failure.kind === "workspace_without_mode") {
    return new RemoteApprovalExecutionContextError({
      code: "REMOTE_APPROVAL_CONTEXT_MODE_REQUIRED",
      message:
        "Remote inner approval workspace authority was provided without the matching remote execution mode.",
      context: {
        command_name: "approval",
        ...(failure.modeValue !== undefined
          ? { remote_approval_mode: failure.modeValue }
          : {}),
        ...(failure.workspaceRoot !== undefined
          ? { remote_workspace_root: failure.workspaceRoot }
          : {})
      }
    });
  }

  if (failure.kind === "unsupported_mode") {
    return new RemoteApprovalExecutionContextError({
      code: "REMOTE_APPROVAL_CONTEXT_MODE_INVALID",
      message:
        "Remote inner approval mode env var contains an unsupported execution mode.",
      context: {
        command_name: "approval",
        remote_approval_mode: failure.modeValue,
        ...(failure.workspaceRoot !== undefined
          ? { remote_workspace_root: failure.workspaceRoot }
          : {})
      }
    });
  }

  return new RemoteApprovalExecutionContextError({
    code: "REMOTE_APPROVAL_CONTEXT_WORKSPACE_ROOT_REQUIRED",
    message:
      "Remote inner approval requires explicit clone-root workspace authority.",
    context: {
      command_name: "approval",
      remote_approval_mode: failure.modeValue
    }
  });
}

export function resolveRemoteApprovalExecutionContextFromEnv():
  | RemoteApprovalExecutionContext
  | undefined {
  return resolveRemoteCloneExecutionContextFromEnv({
    modeEnvVar: remoteApprovalModeEnvVar,
    workspaceRootEnvVar: remoteApprovalWorkspaceRootEnvVar,
    expectedMode: remoteApprovalModeInnerRemoteExecution,
    workspaceWithoutExpectedMode: "missing_or_mismatch",
    canonicalizeWorkspaceRoot: canonicalizeApprovalExecutionPath,
    toError: toRemoteApprovalExecutionContextError
  });
}
