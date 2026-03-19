import {
  emitConvergedFromWorkspaceCommandOrchestration,
  throwAsConvergedCommandError
} from "../../shared/converged/convergedCommandOrchestration.js";
import {
  ConvergedCommandError
} from "../../shared/converged/convergedCommandError.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedInput,
  EmitConvergedResult
} from "../../shared/converged/convergedCommandTypes.js";

export { ConvergedCommandError as ConvergedCommandErrorV11 };

export type EmitConvergedV11Input = EmitConvergedInput;
export type EmitConvergedV11Result = EmitConvergedResult;
export type EmitConvergedV11Dependencies = EmitConvergedDependencies;

export function asConvergedCommandErrorV11(error: unknown): never {
  return throwAsConvergedCommandError(error);
}

export async function emitConvergedFromWorkspaceV11(
  input: EmitConvergedV11Input,
  dependencies: EmitConvergedV11Dependencies = {}
): Promise<EmitConvergedV11Result> {
  return emitConvergedFromWorkspaceCommandOrchestration(input, dependencies);
}
