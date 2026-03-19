export class ApprovalCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ApprovalCommandError";
  }
}

export function createApprovalCommandError(message: string): ApprovalCommandError {
  return new ApprovalCommandError(message);
}

export function isApprovalCommandError(candidate: unknown): boolean {
  return candidate instanceof ApprovalCommandError;
}
