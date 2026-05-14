import { createBubbleMergeError } from "../error/mergeCommandErrorRuntime.js";
import {
  canonicalizeRemoteExecutionPath,
  resolveRemoteCloneExecutionContextFromEnv,
  type RemoteExecutionContextEnvFailure
} from "../../../remote/remoteExecutionContextEnv.js";

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

export const canonicalizeMergeExecutionPath = canonicalizeRemoteExecutionPath;

function toRemoteMergeExecutionContextError(
  failure: RemoteExecutionContextEnvFailure
): Error {
  if (failure.kind === "workspace_without_mode") {
    return createBubbleMergeError({
      reasonCode: MERGE_REMOTE_MODE_REQUIRED,
      message:
        "Remote inner merge workspace authority was provided without the matching remote execution mode.",
      context: {
        remote_merge_mode: failure.modeValue ?? "missing",
        ...(failure.workspaceRoot !== undefined
          ? { remote_workspace_root: failure.workspaceRoot }
          : {})
      }
    });
  }

  if (failure.kind === "unsupported_mode") {
    return createBubbleMergeError({
      reasonCode: MERGE_REMOTE_MODE_UNSUPPORTED,
      message:
        `Remote inner merge mode env var contains an unsupported execution mode: '${failure.modeValue}'.`,
      context: {
        remote_merge_mode: failure.modeValue
      }
    });
  }

  return createBubbleMergeError({
    reasonCode: MERGE_REMOTE_WORKSPACE_ROOT_REQUIRED,
    message:
      "Remote inner merge requires explicit clone-root workspace authority.",
    context: {
      remote_merge_mode: remoteMergeModeInnerRemoteExecution
    }
  });
}

export function resolveRemoteMergeExecutionContextFromEnv():
  | RemoteMergeExecutionContext
  | undefined {
  return resolveRemoteCloneExecutionContextFromEnv({
    modeEnvVar: remoteMergeModeEnvVar,
    workspaceRootEnvVar: remoteMergeWorkspaceRootEnvVar,
    expectedMode: remoteMergeModeInnerRemoteExecution,
    workspaceWithoutExpectedMode: "missing_or_mismatch",
    canonicalizeWorkspaceRoot: canonicalizeMergeExecutionPath,
    toError: toRemoteMergeExecutionContextError
  });
}
