import type {
  raiseRepeatCleanDownstreamConvergedRejected
} from "../../domain/pass/repeatCleanPolicyRejection.js";

export interface CreatePassCommandErrorRuntimeInput<TError extends Error> {
  createPassCommandError: (message: string) => TError;
  raiseDownstreamRejected: typeof raiseRepeatCleanDownstreamConvergedRejected;
}

export interface PassCommandErrorRuntime<TError extends Error> {
  createError: (message: string) => TError;
  onDownstreamRejected: (reason: string) => never;
}

export function createPassCommandErrorRuntime<TError extends Error>(
  input: CreatePassCommandErrorRuntimeInput<TError>
): PassCommandErrorRuntime<TError> {
  const createError = (message: string) => input.createPassCommandError(message);
  return {
    createError,
    onDownstreamRejected: (reason) =>
      input.raiseDownstreamRejected({
        reason,
        createError
      })
  };
}
