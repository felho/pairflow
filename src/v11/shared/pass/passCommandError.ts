import { normalizePassCommandError } from "./passCommandErrorNormalization.js";

export class PassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PassCommandError";
  }
}

export function createPassCommandError(message: string): PassCommandError {
  return new PassCommandError(message);
}

export function throwAsPassCommandError(error: unknown): never {
  throw normalizePassCommandError({
    error,
    isPassCommandError: (candidate) => candidate instanceof PassCommandError,
    createPassCommandError
  });
}
