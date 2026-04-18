import {
  remoteStartModeEnvVar,
  remoteStartModeInnerRemoteActivation,
  remoteStartWorkspaceRootEnvVar
} from "../../shared/bubble/remoteStartExecutionContext.js";
import { createStartBubbleError } from "./startCommandRuntime.js";

export const remoteCloneStartModeEnvVar = remoteStartModeEnvVar;
export const remoteCloneWorkspaceRootEnvVar = remoteStartWorkspaceRootEnvVar;
export const remoteCloneStartModeValue = remoteStartModeInnerRemoteActivation;

export interface RemoteCloneStartContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

export function resolveRemoteCloneStartContextFromEnv():
RemoteCloneStartContext | undefined {
  const remoteStartMode = process.env[remoteStartModeEnvVar]?.trim();
  const workspaceRoot = process.env[remoteStartWorkspaceRootEnvVar]?.trim();

  if (
    workspaceRoot !== undefined
    && workspaceRoot.length > 0
    && remoteStartMode !== remoteStartModeInnerRemoteActivation
  ) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start workspace authority was provided without the matching remote activation mode.",
      context: {
        env_var: remoteStartWorkspaceRootEnvVar,
        mode_env_var: remoteStartModeEnvVar,
        mode_value: remoteStartMode ?? null
      }
    });
  }

  if (remoteStartMode === undefined || remoteStartMode.length === 0) {
    return undefined;
  }
  if (remoteStartMode !== remoteStartModeInnerRemoteActivation) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start mode env var contains an unsupported activation mode.",
      context: {
        env_var: remoteStartModeEnvVar,
        mode_value: remoteStartMode
      }
    });
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start requires explicit clone-root workspace authority.",
      context: {
        env_var: remoteStartWorkspaceRootEnvVar
      }
    });
  }

  return {
    kind: "remote_clone",
    workspaceRoot
  };
}
