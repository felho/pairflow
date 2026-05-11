import { normalizeStartupReconcilerError } from "./reconcileCommandErrorNormalization.js";
import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../../../../shared/errors/commandErrorDetails.js";

export class StartupReconcilerError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "StartupReconcilerError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "reconcile");
  }
}

export function createStartupReconcilerError(
  input: PairflowCommandErrorInput
): StartupReconcilerError {
  return new StartupReconcilerError(input);
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
