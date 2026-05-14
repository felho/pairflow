import {
  remoteStartExternalPairflowCommandEnvVar,
  remoteStartModeEnvVar,
  remoteStartModeInnerRemoteActivation,
  remoteStartWorkspaceRootEnvVar
} from "../../../../shared/bubble/remoteStartExecutionContext.js";
import {
  resolveRemoteCloneExecutionContextFromEnv,
  type RemoteExecutionContextEnvFailure
} from "../../../remote/remoteExecutionContextEnv.js";
import { createStartBubbleError } from "../runtime/startCommandRuntime.js";

export const remoteCloneStartModeEnvVar = remoteStartModeEnvVar;
export const remoteCloneWorkspaceRootEnvVar = remoteStartWorkspaceRootEnvVar;
export const remoteCloneExternalPairflowCommandEnvVar =
  remoteStartExternalPairflowCommandEnvVar;
export const remoteCloneStartModeValue = remoteStartModeInnerRemoteActivation;

export interface RemoteCloneStartContext {
  kind: "remote_clone";
  workspaceRoot: string;
  externalPairflowCommand?: string;
}

function toRemoteCloneStartContextError(
  failure: RemoteExecutionContextEnvFailure
): Error {
  if (failure.kind === "workspace_without_mode") {
    return createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start workspace authority was provided without the matching remote activation mode.",
      context: {
        env_var: remoteStartWorkspaceRootEnvVar,
        mode_env_var: remoteStartModeEnvVar,
        mode_value: failure.modeValue ?? null
      }
    });
  }

  if (failure.kind === "unsupported_mode") {
    return createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start mode env var contains an unsupported activation mode.",
      context: {
        env_var: remoteStartModeEnvVar,
        mode_value: failure.modeValue
      }
    });
  }

  return createStartBubbleError({
    reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
    message:
      "Remote inner start requires explicit clone-root workspace authority.",
    context: {
      env_var: remoteStartWorkspaceRootEnvVar
    }
  });
}

export function resolveRemoteCloneStartContextFromEnv():
RemoteCloneStartContext | undefined {
  const externalPairflowCommand =
    process.env[remoteStartExternalPairflowCommandEnvVar]?.trim();
  const context = resolveRemoteCloneExecutionContextFromEnv({
    modeEnvVar: remoteStartModeEnvVar,
    workspaceRootEnvVar: remoteStartWorkspaceRootEnvVar,
    expectedMode: remoteStartModeInnerRemoteActivation,
    workspaceWithoutExpectedMode: "missing_or_mismatch",
    canonicalizeWorkspaceRoot: (value) => value,
    toError: toRemoteCloneStartContextError
  });
  if (context === undefined) {
    return undefined;
  }

  return {
    ...context,
    ...(externalPairflowCommand !== undefined &&
    externalPairflowCommand.length > 0
      ? { externalPairflowCommand }
      : {})
  };
}
