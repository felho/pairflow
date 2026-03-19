import { toMetaReviewGateErrorV11 as toMetaReviewGateError } from "../../application/metaReviewGate/emitMetaReviewGateV11.js";
import { WorkspaceResolutionError } from "../../../core/bubble/workspaceResolution.js";

export interface NormalizeConvergedCommandErrorInput {
  error: unknown;
  isConvergedCommandError: (candidate: unknown) => boolean;
  createConvergedCommandError: (message: string) => Error;
}

export function normalizeConvergedCommandError(
  input: NormalizeConvergedCommandErrorInput
): unknown {
  if (input.isConvergedCommandError(input.error)) {
    return input.error;
  }

  if (input.error instanceof WorkspaceResolutionError) {
    return input.createConvergedCommandError(input.error.message);
  }

  if (input.error instanceof Error && input.error.name === "MetaReviewGateError") {
    const gateError = toMetaReviewGateError(input.error);
    return input.createConvergedCommandError(gateError.message);
  }

  if (input.error instanceof Error) {
    return input.createConvergedCommandError(input.error.message);
  }

  return input.error;
}
