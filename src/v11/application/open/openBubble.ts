import {
  BubbleLookupError,
  resolveBubbleById
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  createOpenBubbleError,
  executeOpenCommand,
  OpenBubbleError,
  openBubbleRuntime,
  type OpenBubbleDependencies,
  type OpenBubbleInput,
  type OpenBubbleResult,
  type OpenCommandExecutionInput,
  type OpenCommandExecutionResult,
  type OpenCommandExecutor
} from "./openBubbleRuntime.js";

export async function openBubble(
  input: OpenBubbleInput,
  dependencies: OpenBubbleDependencies = {}
): Promise<OpenBubbleResult> {
  return openBubbleRuntime(input, {
    ...dependencies,
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById
  });
}

export function asOpenBubbleError(error: unknown): never {
  if (error instanceof OpenBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw createOpenBubbleError({
      message: error.message,
      context: {
        reason: "bubble_lookup_error",
        reason_code: "OPEN_BUBBLE_LOOKUP_ERROR"
      },
      cause: error
    });
  }
  if (error instanceof Error) {
    throw createOpenBubbleError({
      message: error.message,
      context: {
        reason: "unexpected_open_error",
        reason_code: "OPEN_UNEXPECTED_ERROR"
      },
      cause: error
    });
  }
  throw error;
}

export {
  executeOpenCommand,
  OpenBubbleError
};
export type {
  OpenBubbleDependencies,
  OpenBubbleInput,
  OpenBubbleResult,
  OpenCommandExecutionInput,
  OpenCommandExecutionResult,
  OpenCommandExecutor
};
