import {
  canonicalizeRemoteExecutionPath,
  resolveRemoteCloneExecutionContextFromEnv,
  type RemoteExecutionContextEnvFailure
} from "../../../remote/remoteExecutionContextEnv.js";

export const remoteDeleteModeEnvVar = "PAIRFLOW_REMOTE_DELETE_MODE";
export const remoteDeleteWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_DELETE_WORKSPACE_ROOT";
export const remoteDeleteModeInnerRemoteExecution = "inner_remote_execution";

export interface RemoteDeleteExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export class RemoteDeleteExecutionContextError extends Error {
  public readonly code: string;
  public readonly context: Readonly<Record<string, unknown>>;

  public constructor(input: {
    code: string;
    message: string;
    context: Readonly<Record<string, unknown>>;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteDeleteExecutionContextError";
    this.code = input.code;
    this.context = input.context;
  }
}

function toRemoteDeleteExecutionContextError(input: {
  code: string;
  message: string;
  context: Readonly<Record<string, unknown>>;
  cause?: unknown;
}): RemoteDeleteExecutionContextError {
  return new RemoteDeleteExecutionContextError(input);
}

export const canonicalizeDeleteExecutionPath = canonicalizeRemoteExecutionPath;

export function resolveRemoteDeleteExecutionContextFromEnv():
  | RemoteDeleteExecutionContext
  | undefined {
  return resolveRemoteCloneExecutionContextFromEnv({
    modeEnvVar: remoteDeleteModeEnvVar,
    workspaceRootEnvVar: remoteDeleteWorkspaceRootEnvVar,
    expectedMode: remoteDeleteModeInnerRemoteExecution,
    workspaceWithoutExpectedMode: "missing_only",
    canonicalizeWorkspaceRoot: canonicalizeDeleteExecutionPath,
    toError: (failure: RemoteExecutionContextEnvFailure) => {
      if (failure.kind === "workspace_without_mode") {
        return toRemoteDeleteExecutionContextError({
          code: "REMOTE_DELETE_MODE_REQUIRED",
          message:
            "Remote inner delete workspace authority was provided without the matching remote execution mode.",
          context: {
            modeEnvVar: remoteDeleteModeEnvVar,
            workspaceEnvVar: remoteDeleteWorkspaceRootEnvVar,
            remoteDeleteMode: failure.modeValue ?? null,
            workspaceRoot: failure.workspaceRoot ?? null
          }
        });
      }

      if (failure.kind === "unsupported_mode") {
        return toRemoteDeleteExecutionContextError({
          code: "REMOTE_DELETE_MODE_INVALID",
          message:
            `Remote inner delete mode env var contains an unsupported execution mode: '${failure.modeValue}'.`,
          context: {
            modeEnvVar: remoteDeleteModeEnvVar,
            workspaceEnvVar: remoteDeleteWorkspaceRootEnvVar,
            remoteDeleteMode: failure.modeValue,
            workspaceRoot: failure.workspaceRoot ?? null
          }
        });
      }

      return toRemoteDeleteExecutionContextError({
        code: "REMOTE_DELETE_WORKSPACE_REQUIRED",
        message:
          "Remote inner delete requires explicit clone-root workspace authority.",
        context: {
          modeEnvVar: remoteDeleteModeEnvVar,
          workspaceEnvVar: remoteDeleteWorkspaceRootEnvVar,
          remoteDeleteMode: failure.modeValue,
          workspaceRoot: null
        }
      });
    }
  });
}
