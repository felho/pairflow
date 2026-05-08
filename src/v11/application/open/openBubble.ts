import { isNamedError } from "../../shared/errors/namedError.js";
import type { OpenBubbleResult } from "../../ports/openBubble.js";
import {
  executeOpenCommand,
  openBubbleRuntime,
  type OpenBubbleDependencies,
  type OpenBubbleInput,
  type OpenCommandExecutionInput,
  type OpenCommandExecutionResult,
  type OpenCommandExecutor
} from "./openBubbleRuntime.js";
import {
  createOpenBubbleError,
  OpenBubbleError
} from "./openBubbleError.js";
import { openBubbleDefaults } from "./openBubbleDefaults.js";

export async function openBubble(
  input: OpenBubbleInput,
  dependencies: OpenBubbleDependencies = {}
): Promise<OpenBubbleResult> {
  return openBubbleRuntime(input, {
    ...dependencies,
    resolveBubbleById:
      dependencies.resolveBubbleById
      ?? ((...args) => openBubbleDefaults.resolveBubbleById(...args)),
    readRemotePointer:
      dependencies.readRemotePointer
      ?? ((...args) => openBubbleDefaults.readRemotePointer(...args))
  });
}

export function asOpenBubbleError(error: unknown): never {
  if (error instanceof OpenBubbleError) {
    throw error;
  }
  if (isNamedError(error, "BubbleLookupError")) {
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
