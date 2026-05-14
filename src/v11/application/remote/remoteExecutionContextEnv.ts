import { realpathSync } from "node:fs";
import { resolve } from "node:path";

export interface RemoteCloneExecutionContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export type RemoteExecutionContextEnvFailure =
  | {
      kind: "workspace_without_mode";
      workspaceRoot: string;
      modeValue?: string;
    }
  | {
      kind: "unsupported_mode";
      modeValue: string;
      workspaceRoot?: string;
    }
  | {
      kind: "workspace_required";
      modeValue: string;
    };

export function canonicalizeRemoteExecutionPath(pathValue: string): string {
  const absolutePath = resolve(pathValue);
  try {
    return realpathSync.native(absolutePath);
  } catch {
    return absolutePath;
  }
}

function readTrimmedEnv(envVar: string): string | undefined {
  const value = process.env[envVar]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

export function resolveRemoteCloneExecutionContextFromEnv(input: {
  modeEnvVar: string;
  workspaceRootEnvVar: string;
  expectedMode: string;
  // These switches preserve command-specific legacy behavior. New command lanes
  // should prefer a single explicit mode+workspace contract before using them.
  workspaceWithoutExpectedMode:
    | "missing_only"
    | "missing_or_mismatch";
  canonicalizeWorkspaceRoot?: (pathValue: string) => string;
  toError: (failure: RemoteExecutionContextEnvFailure) => Error;
}): RemoteCloneExecutionContext | undefined {
  const modeValue = readTrimmedEnv(input.modeEnvVar);
  const workspaceRoot = readTrimmedEnv(input.workspaceRootEnvVar);

  const workspaceProvided = workspaceRoot !== undefined;
  const modeMatches = modeValue === input.expectedMode;
  const workspaceWithoutExpectedMode =
    workspaceProvided
    && (
      input.workspaceWithoutExpectedMode === "missing_or_mismatch"
        ? !modeMatches
        : modeValue === undefined
    );

  if (workspaceWithoutExpectedMode) {
    throw input.toError({
      kind: "workspace_without_mode",
      ...(modeValue !== undefined ? { modeValue } : {}),
      workspaceRoot
    });
  }

  if (modeValue === undefined) {
    return undefined;
  }

  if (!modeMatches) {
    throw input.toError({
      kind: "unsupported_mode",
      modeValue,
      ...(workspaceRoot !== undefined ? { workspaceRoot } : {})
    });
  }

  if (workspaceRoot === undefined) {
    throw input.toError({
      kind: "workspace_required",
      modeValue
    });
  }

  return {
    kind: "remote_clone",
    workspaceRoot: (
      input.canonicalizeWorkspaceRoot ?? canonicalizeRemoteExecutionPath
    )(workspaceRoot)
  };
}
