export class ConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConvergedCommandError";
  }
}

export function createConvergedCommandError(message: string): ConvergedCommandError {
  return new ConvergedCommandError(message);
}

export function isConvergedCommandError(error: unknown): error is ConvergedCommandError {
  return error instanceof ConvergedCommandError;
}
