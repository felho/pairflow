import { isNamedError } from "../../shared/errors/namedError.js";

export interface NormalizePassCommandErrorInput {
  error: unknown;
  isPassCommandError: (candidate: unknown) => boolean;
  createPassCommandError: PairflowCreateCommandError;
}

export function normalizePassCommandError(
  input: NormalizePassCommandErrorInput
): unknown {
  if (input.isPassCommandError(input.error)) {
    return input.error;
  }

  if (isNamedError(input.error, "WorkspaceResolutionError")) {
    return input.createPassCommandError(input.error.message);
  }

  if (input.error instanceof Error) {
    return input.createPassCommandError(input.error.message);
  }

  return input.error;
}
