import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";
import {
  isBubbleExecutorType
} from "../../v11/shared/remote/remoteExecutionTypes.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { BUBBLE_EXECUTOR_INVALID } from "./errors.js";
import { readString } from "./readers.js";

const allowedExecutorKeys = new Set(["type", "remote"]);
const inlineRemoteDetailKeys = new Set([
  "host",
  "user",
  "repo_base",
  "pairflow_command",
  "default_port_forwards"
]);

export function validateBubbleExecutor(
  executor: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["executor"] | undefined {
  if (executor === undefined) {
    return undefined;
  }

  for (const key of Object.keys(executor)) {
    if (allowedExecutorKeys.has(key)) {
      continue;
    }

    errors.push({
      path: `executor.${key}`,
      message: inlineRemoteDetailKeys.has(key)
        ? `${BUBBLE_EXECUTOR_INVALID}: Inline remote host details are not allowed in [executor]; use [remotes.<name>] in the global config and keep only executor.remote in bubble.toml.`
        : `${BUBBLE_EXECUTOR_INVALID}: Unknown executor field "${key}"`
    });
  }

  const executorType = readString(
    executor,
    "type",
    "executor.type",
    errors,
    true
  );
  const executorRemote = readString(
    executor,
    "remote",
    "executor.remote",
    errors,
    true
  );

  if (executorType !== undefined && !isBubbleExecutorType(executorType)) {
    errors.push({
      path: "executor.type",
      message: `${BUBBLE_EXECUTOR_INVALID}: Must be "ssh" when [executor] is present`
    });
  }

  if (
    executorType !== undefined
    && executorRemote !== undefined
    && isBubbleExecutorType(executorType)
  ) {
    return {
      type: executorType,
      remote: executorRemote
    };
  }

  return undefined;
}
