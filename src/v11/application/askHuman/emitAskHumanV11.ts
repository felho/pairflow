import {
  emitAskHumanFromWorkspace,
  type EmitAskHumanDependencies,
  type EmitAskHumanInput,
  type EmitAskHumanResult
} from "../../../core/agent/askHuman.js";
export {
  asAskHumanCommandError as asAskHumanCommandErrorV11,
  AskHumanCommandError as AskHumanCommandErrorV11
} from "../../../core/agent/askHuman.js";

export type EmitAskHumanV11Input = EmitAskHumanInput;
export type EmitAskHumanV11Result = EmitAskHumanResult;
export type EmitAskHumanV11Dependencies = EmitAskHumanDependencies;

// M1 parity bootstrap: v11 entrypoint delegates to legacy implementation.
// This provides a stable seam for future v11-only orchestration extraction.
export async function emitAskHumanFromWorkspaceV11(
  input: EmitAskHumanV11Input,
  dependencies: EmitAskHumanV11Dependencies = {}
): Promise<EmitAskHumanV11Result> {
  return emitAskHumanFromWorkspace(input, dependencies);
}
