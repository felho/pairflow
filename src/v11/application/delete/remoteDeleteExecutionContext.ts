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
    throw toRemoteDeleteExecutionContextError({
      code: "REMOTE_DELETE_MODE_REQUIRED",
      message:
        "Remote inner delete workspace authority was provided without the matching remote execution mode.",
      context: {
        modeEnvVar: remoteDeleteModeEnvVar,
        workspaceEnvVar: remoteDeleteWorkspaceRootEnvVar,
        remoteDeleteMode: remoteDeleteMode ?? null,
        workspaceRoot
      }
    });
  }

  if (remoteDeleteMode === undefined || remoteDeleteMode.length === 0) {
    return undefined;
  }
  if (remoteDeleteMode !== remoteDeleteModeInnerRemoteExecution) {
    throw toRemoteDeleteExecutionContextError({
      code: "REMOTE_DELETE_MODE_INVALID",
      message:
        `Remote inner delete mode env var contains an unsupported execution mode: '${remoteDeleteMode}'.`,
      context: {
        modeEnvVar: remoteDeleteModeEnvVar,
        workspaceEnvVar: remoteDeleteWorkspaceRootEnvVar,
        remoteDeleteMode,
        workspaceRoot: workspaceRoot ?? null
      }
    });
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw toRemoteDeleteExecutionContextError({
      code: "REMOTE_DELETE_WORKSPACE_REQUIRED",
      message:
        "Remote inner delete requires explicit clone-root workspace authority.",
      context: {
        modeEnvVar: remoteDeleteModeEnvVar,
        workspaceEnvVar: remoteDeleteWorkspaceRootEnvVar,
        remoteDeleteMode,
        workspaceRoot: workspaceRoot ?? null
      }
    });
  }

  return {
    kind: "remote_clone",
    workspaceRoot: canonicalizeDeleteExecutionPath(workspaceRoot)
  };
}
