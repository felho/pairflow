import {
  emitPassFromWorkspace
} from "../../../core/agent/pass.js";
import type {
  EmitPassDependencies,
  EmitPassInput,
  EmitPassResult
} from "./passCommandContract.js";
export {
  asPassCommandError as asPassCommandErrorV11,
  inferPassIntent as inferPassIntentV11,
  PassCommandError as PassCommandErrorV11
} from "../../../core/agent/pass.js";
import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";

export type EmitPassV11Input = EmitPassInput;
export type EmitPassV11Result = EmitPassResult;
export type EmitPassV11Dependencies = EmitPassDependencies;
export type InferPassIntentV11 = (activeRole: AgentRole) => PassIntent;

// M1 parity bootstrap: v11 entrypoint delegates to legacy implementation.
// This provides a stable seam for future v11-only orchestration extraction.
export async function emitPassFromWorkspaceV11(
  input: EmitPassV11Input,
  dependencies: EmitPassV11Dependencies = {}
): Promise<EmitPassV11Result> {
  return emitPassFromWorkspace(input, dependencies);
}
