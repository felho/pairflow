import { normalizeStartupReconcilerError } from "./reconcileCommandErrorNormalization.js";

export class StartupReconcilerError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StartupReconcilerError";
  }
}

export function createStartupReconcilerError(
  message: string
): StartupReconcilerError {
  return new StartupReconcilerError(message);
}

export function throwAsStartupReconcilerError(error: unknown): never {
  throw normalizeStartupReconcilerError({
    error,
    isStartupReconcilerError:
      (candidate): candidate is StartupReconcilerError =>
        candidate instanceof StartupReconcilerError,
    createStartupReconcilerError,
    isError: (candidate): candidate is Error => candidate instanceof Error
  });
}
