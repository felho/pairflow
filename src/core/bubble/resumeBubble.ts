import {
  asHumanReplyCommandError,
  emitHumanReply,
  type EmitHumanReplyResult
} from "../human/reply.js";

export const DEFAULT_RESUME_MESSAGE =
  "Operator resumed ping-pong after manual intervention.";

export interface ResumeBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export type ResumeBubbleResult = EmitHumanReplyResult;

export interface ResumeBubbleDependencies {
  emitHumanReply?: typeof emitHumanReply;
}

export class ResumeBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResumeBubbleError";
  }
}

export async function resumeBubble(
  input: ResumeBubbleInput,
  dependencies: ResumeBubbleDependencies = {}
): Promise<ResumeBubbleResult> {
  const emitReply = dependencies.emitHumanReply ?? emitHumanReply;

  try {
    return await emitReply({
      bubbleId: input.bubbleId,
      message: DEFAULT_RESUME_MESSAGE,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
      ...(input.now !== undefined ? { now: input.now } : {})
    });
  } catch (error) {
    asResumeBubbleError(error);
  }
}

export function asResumeBubbleError(error: unknown): never {
  if (error instanceof ResumeBubbleError) {
    throw error;
  }

  try {
    asHumanReplyCommandError(error);
  } catch (humanReplyError) {
    if (humanReplyError instanceof Error) {
      throw new ResumeBubbleError(humanReplyError.message);
    }
    throw humanReplyError;
  }

  throw error;
}
