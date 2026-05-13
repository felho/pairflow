import {
  OpenBubbleError,
  type OpenBubbleErrorContext
} from "../../openBubbleError.js";

export function createOpenBubbleError(input: {
  message: string;
  context: OpenBubbleErrorContext;
  cause?: unknown;
}): OpenBubbleError {
  return new OpenBubbleError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}
