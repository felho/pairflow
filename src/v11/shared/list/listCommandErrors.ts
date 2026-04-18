import { isRemoteBubbleStatusErrorLike } from "../status/remoteBubbleStatusContract.js";

export interface BubbleListErrorContext {
  source: "repo_resolution" | "unexpected_error";
  repoPathProvided: boolean;
  cwdProvided: boolean;
  causeName?: string | undefined;
}

export interface BubbleListErrorInput {
  message: string;
  cause?: unknown;
  context?: BubbleListErrorContext | undefined;
}

export interface BubbleListErrorNormalizationContext {
  repoPathProvided: boolean;
  cwdProvided: boolean;
}

export class BubbleListError extends Error {
  public readonly context: BubbleListErrorContext | undefined;

  public constructor(input: string | BubbleListErrorInput) {
    const normalized =
      typeof input === "string"
        ? { message: input, cause: undefined, context: undefined }
        : input;
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleListError";
    this.context = normalized.context;
  }
}

export function isRefreshFallbackEligibleError(error: unknown): boolean {
  return (
    isRemoteBubbleStatusErrorLike(error)
    || (
      error instanceof BubbleListError
      && error.message.startsWith("LIST_REMOTE_REFRESH_UNAVAILABLE:")
    )
  );
}
