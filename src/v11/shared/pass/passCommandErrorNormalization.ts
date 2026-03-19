import { WorkspaceResolutionError } from "../../../core/bubble/workspaceResolution.js";

export interface NormalizePassCommandErrorInput {
  error: unknown;
  isPassCommandError: (candidate: unknown) => boolean;
  createPassCommandError: (message: string) => Error;
}

export function normalizePassCommandError(
  input: NormalizePassCommandErrorInput
): unknown {
  if (input.isPassCommandError(input.error)) {
    return input.error;
  }

  if (input.error instanceof WorkspaceResolutionError) {
    return input.createPassCommandError(input.error.message);
  }

  if (input.error instanceof Error) {
    return input.createPassCommandError(input.error.message);
  }

  return input.error;
}
