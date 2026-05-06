import { toMetaReviewGateError } from "../../shared/metaReviewGate/index.js";
import { isNamedError } from "../../shared/errors/namedError.js";

export interface NormalizeConvergedCommandErrorInput {
  error: unknown;
  isConvergedCommandError: (candidate: unknown) => boolean;
  createConvergedCommandError: PairflowCreateCommandError;
}

export function normalizeConvergedCommandError(
  input: NormalizeConvergedCommandErrorInput
): unknown {
  if (input.isConvergedCommandError(input.error)) {
    return input.error;
  }

  if (isNamedError(input.error, "WorkspaceResolutionError")) {
    return input.createConvergedCommandError(input.error.message);
  }

  if (input.error instanceof Error && input.error.name === "MetaReviewGateError") {
    const gateError = toMetaReviewGateError(input.error);
    return input.createConvergedCommandError(gateError.message);
  }

  if (input.error instanceof Error) {
    const structuredError = input.error as Error & {
      reasonCode?: string;
      context?: PairflowCommandErrorContext;
      cause?: unknown;
    };
    if (
      structuredError.reasonCode !== undefined
      || structuredError.context !== undefined
      || structuredError.cause !== undefined
    ) {
      return input.createConvergedCommandError({
        message: structuredError.message,
        ...(structuredError.reasonCode !== undefined
          ? { reasonCode: structuredError.reasonCode }
          : {}),
        ...(structuredError.context !== undefined
          ? { context: structuredError.context }
          : {}),
        ...(structuredError.cause !== undefined
          ? { cause: structuredError.cause }
          : {})
      });
    }
    return input.createConvergedCommandError(input.error.message);
  }

  return input.error;
}
