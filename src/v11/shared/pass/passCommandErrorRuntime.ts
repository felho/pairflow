import type {
  raiseRepeatCleanDownstreamConvergedRejected
} from "../../domain/pass/repeatCleanPolicyRejection.js";

export interface CreatePassCommandErrorRuntimeInput<TError extends Error> {
  createPassCommandError: (input: PairflowCommandErrorInput) => TError;
  raiseDownstreamRejected: typeof raiseRepeatCleanDownstreamConvergedRejected;
}

export interface PassCommandErrorRuntime {
  createError: PairflowCreateCommandError;
  onDownstreamRejected: (reason: string) => never;
}

export function createPassCommandErrorRuntime<TError extends Error>(
  input: CreatePassCommandErrorRuntimeInput<TError>
): PassCommandErrorRuntime {
  const createError: PairflowCreateCommandError = (errorInput) =>
    input.createPassCommandError(errorInput);
  return {
    createError,
    onDownstreamRejected: (reason) =>
      input.raiseDownstreamRejected({
        reason,
        createError
      })
  };
}
