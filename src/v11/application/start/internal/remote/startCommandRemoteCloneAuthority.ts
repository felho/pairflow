import { resolve } from "node:path";

import type {
  BubbleRemotePointer
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type {
  VerifyRemoteCloneStartAuthorityPort
} from "../../../../ports/remoteCloneStartAuthority.js";
import { createStartBubbleError } from "../runtime/startCommandRuntime.js";

export const pairflowWorktreeRootEnvVar = "PAIRFLOW_WORKTREE_ROOT";

export interface VerifyRemoteCloneStartAuthorityDependencies {
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  readPairflowWorktreeRootEnv?: () => string | undefined;
}

function resolveOptionalWorkspacePath(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return resolve(trimmed);
}

function readPairflowWorktreeRootEnv(): string | undefined {
  return process.env[pairflowWorktreeRootEnvVar];
}

export function createVerifyRemoteCloneStartAuthority(
  dependencies: VerifyRemoteCloneStartAuthorityDependencies
): VerifyRemoteCloneStartAuthorityPort {
  return async (input) => {
    const normalizedWorkspaceRoot = resolve(input.remoteWorkspaceRoot);
    const pairflowWorktreeRoot = resolveOptionalWorkspacePath(
      (dependencies.readPairflowWorktreeRootEnv ?? readPairflowWorktreeRootEnv)()
    );

    if (pairflowWorktreeRoot !== normalizedWorkspaceRoot) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
        message:
          `Bubble ${input.bubbleId} remote inner-start env is only valid inside a verified remote clone workspace authority.`,
        context: {
          bubble_id: input.bubbleId,
          remote_workspace_root: normalizedWorkspaceRoot,
          pairflow_worktree_root: pairflowWorktreeRoot ?? null,
          required_env_var: pairflowWorktreeRootEnvVar
        }
      });
    }

    let remotePointer: BubbleRemotePointer | null;
    try {
      remotePointer = await dependencies.readRemotePointer(input.remotePointerPath);
    } catch (error) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
        message:
          `Bubble ${input.bubbleId} could not verify remote clone control-plane boundaries for inner-start env.`,
        context: {
          bubble_id: input.bubbleId,
          remote_pointer_path: input.remotePointerPath
        },
        cause: error
      });
    }

    if (remotePointer !== null) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
        message:
          `Bubble ${input.bubbleId} refused remote inner-start env because local source-repo remote artifacts are still present.`,
        context: {
          bubble_id: input.bubbleId,
          remote_pointer_kind: remotePointer.kind,
          remote_pointer_path: input.remotePointerPath
        }
      });
    }
  };
}
