import {
  DEFAULT_RESUME_MESSAGE,
  type ResumeBubbleDependencies,
  type ResumeBubbleInput,
  type ResumeBubbleResult
} from "../../application/resume/resumeCommandContract.js";
import { emitHumanReplyV11 as emitHumanReply } from "../../application/reply/emitReplyV11.js";

export async function resumeBubbleCommandOrchestration(
  input: ResumeBubbleInput,
  dependencies: ResumeBubbleDependencies = {}
): Promise<ResumeBubbleResult> {
  const emitReply = dependencies.emitHumanReply ?? emitHumanReply;

  return emitReply({
    bubbleId: input.bubbleId,
    message: DEFAULT_RESUME_MESSAGE,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    ...(input.now !== undefined ? { now: input.now } : {})
  });
}
