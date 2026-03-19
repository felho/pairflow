import {
  emitConvergedFromWorkspace,
  type EmitConvergedDependencies,
  type EmitConvergedInput,
  type EmitConvergedResult
} from "../../../core/agent/converged.js";
export {
  asConvergedCommandError as asConvergedCommandErrorV11,
  ConvergedCommandError as ConvergedCommandErrorV11
} from "../../../core/agent/converged.js";

export type EmitConvergedV11Input = EmitConvergedInput;
export type EmitConvergedV11Result = EmitConvergedResult;
export type EmitConvergedV11Dependencies = EmitConvergedDependencies;

// M1 parity bootstrap: v11 entrypoint delegates to legacy implementation.
// This provides a stable seam for future v11-only orchestration extraction.
export async function emitConvergedFromWorkspaceV11(
  input: EmitConvergedV11Input,
  dependencies: EmitConvergedV11Dependencies = {}
): Promise<EmitConvergedV11Result> {
  return emitConvergedFromWorkspace(input, dependencies);
}
