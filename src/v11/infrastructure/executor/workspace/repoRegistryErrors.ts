export interface RepoRegistryErrorContext {
  entryIndex?: number | undefined;
  fieldName?: string | undefined;
  lockPath?: string | undefined;
  registryPath?: string | undefined;
  reason?: string | undefined;
  repoPath?: string | undefined;
  version?: number | undefined;
}

interface RepoRegistryErrorOptions extends ErrorOptions {
  context?: RepoRegistryErrorContext | undefined;
}

export class RepoRegistryError extends Error {
  public readonly context: RepoRegistryErrorContext | undefined;

  public constructor(message: string, options?: RepoRegistryErrorOptions) {
    super(message, options);
    this.name = "RepoRegistryError";
    this.context = options?.context;
  }
}

export class RepoRegistryLockError extends RepoRegistryError {
  public constructor(message: string, options?: RepoRegistryErrorOptions) {
    super(message, options);
    this.name = "RepoRegistryLockError";
  }
}

export function toRepoRegistryError(input: {
  message: string;
  context: RepoRegistryErrorContext;
  cause?: unknown;
}): RepoRegistryError {
  return new RepoRegistryError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

export function toRepoRegistryLockError(input: {
  message: string;
  context: RepoRegistryErrorContext;
  cause?: unknown;
}): RepoRegistryLockError {
  return new RepoRegistryLockError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}
