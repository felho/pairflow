export class BubbleCommitError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCommitError";
  }
}

export function createBubbleCommitError(message: string): BubbleCommitError {
  return new BubbleCommitError(message);
}

export function isBubbleCommitError(candidate: unknown): boolean {
  return candidate instanceof BubbleCommitError;
}
