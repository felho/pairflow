export interface RuntimeSessionsRegistryErrorContext {
  bubbleId?: string | undefined;
  fieldName?: string | undefined;
  lockPath?: string | undefined;
  reason?: string | undefined;
  sessionsPath?: string | undefined;
}

interface RuntimeSessionsRegistryErrorOptions extends ErrorOptions {
  context?: RuntimeSessionsRegistryErrorContext | undefined;
}

export class RuntimeSessionsRegistryError extends Error {
  public readonly context: RuntimeSessionsRegistryErrorContext | undefined;

  public constructor(
    message: string,
    options?: RuntimeSessionsRegistryErrorOptions
  ) {
    super(message, options);
    this.name = "RuntimeSessionsRegistryError";
    this.context = options?.context;
  }
}

export class RuntimeSessionsRegistryLockError extends RuntimeSessionsRegistryError {
  public constructor(
    message: string,
    options?: RuntimeSessionsRegistryErrorOptions
  ) {
    super(message, options);
    this.name = "RuntimeSessionsRegistryLockError";
  }
}

export function toRuntimeSessionsRegistryError(input: {
  message: string;
  context: RuntimeSessionsRegistryErrorContext;
  cause?: unknown;
}): RuntimeSessionsRegistryError {
  return new RuntimeSessionsRegistryError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

export function toRuntimeSessionsRegistryLockError(input: {
  message: string;
  context: RuntimeSessionsRegistryErrorContext;
  cause?: unknown;
}): RuntimeSessionsRegistryLockError {
  return new RuntimeSessionsRegistryLockError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}
