import {
  DEFAULT_RESUME_MESSAGE,
  type ResumeBubbleDependencies,
  type ResumeBubbleInput,
  type ResumeBubbleResult
} from "./resumeCommandContract.js";
import { emitHumanReply } from "../reply/replyCommandApi.js";
export {
  ResumeBubbleError,
  throwAsResumeBubbleError
} from "./resumeCommandRuntime.js";
export { DEFAULT_RESUME_MESSAGE } from "./resumeCommandContract.js";
export type {
  ResumeBubbleDependencies,
  ResumeBubbleInput,
  ResumeBubbleResult
} from "./resumeCommandContract.js";

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
