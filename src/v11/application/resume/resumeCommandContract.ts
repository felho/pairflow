import type {
  EmitHumanReplyInput,
  EmitHumanReplyResult
} from "../reply/replyCommandContract.js";

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
  emitHumanReply?: (
    input: EmitHumanReplyInput
  ) => Promise<EmitHumanReplyResult>;
}
