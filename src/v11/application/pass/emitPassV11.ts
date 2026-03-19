import {
  emitPassFromWorkspace,
  type EmitPassDependencies,
  type EmitPassInput,
  type EmitPassResult
} from "../../../core/agent/pass.js";

export type EmitPassV11Dependencies = EmitPassDependencies;

// M1 parity bootstrap: v11 entrypoint delegates to legacy implementation.
// This provides a stable seam for future v11-only orchestration extraction.
export async function emitPassFromWorkspaceV11(
  input: EmitPassInput,
  dependencies: EmitPassV11Dependencies = {}
): Promise<EmitPassResult> {
  return emitPassFromWorkspace(input, dependencies);
}
