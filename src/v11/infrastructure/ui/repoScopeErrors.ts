export interface UiRepoScopeErrorContext {
  cwd?: string | undefined;
  reason?: string | undefined;
  repoCount?: number | undefined;
  repoParam?: string | undefined;
  resolvedRepoPath?: string | undefined;
}

interface UiRepoScopeErrorOptions extends ErrorOptions {
  context?: UiRepoScopeErrorContext | undefined;
}

export class UiRepoScopeError extends Error {
  public readonly context: UiRepoScopeErrorContext | undefined;

  public constructor(message: string, options?: UiRepoScopeErrorOptions) {
    super(message, options);
    this.name = "UiRepoScopeError";
    this.context = options?.context;
  }
}

export function toUiRepoScopeError(input: {
  message: string;
  context: UiRepoScopeErrorContext;
  cause?: unknown;
}): UiRepoScopeError {
  return new UiRepoScopeError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}
