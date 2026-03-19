import {
  asConvergedCommandErrorV11,
  emitConvergedFromWorkspaceV11
} from "../../v11/application/converged/emitConvergedV11.js";
import {
  ConvergedCommandError
} from "../../v11/shared/converged/convergedCommandError.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedInput,
  EmitConvergedResult
} from "../../v11/shared/converged/convergedCommandTypes.js";
import { resolveConvergedRolloutBlockingReasonCodes as resolveMetaReviewRolloutBlockingReasonCodes } from "../../v11/shared/converged/convergedRolloutBlockingReasonResolver.js";
export { resolveMetaReviewRolloutBlockingReasonCodes };
export { ConvergedCommandError };
export type {
  EmitConvergedDependencies,
  EmitConvergedInput,
  EmitConvergedResult
};

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  return emitConvergedFromWorkspaceV11(input, dependencies);
}

export function asConvergedCommandError(error: unknown): never {
  return asConvergedCommandErrorV11(error);
}
