import { appendProtocolEnvelope } from "../../infrastructure/artifact/transcript/transcriptStore.js";
import { assertGitRepository } from "../../infrastructure/workspace/git.js";
import { extractReviewerFocus } from "./createReviewerFocus.js";
import { BubbleCreateError } from "./createCommandRuntime.js";
import { runCreateBubbleFlow } from "./runCreateBubbleFlow.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "./createCommandContract.js";

export { BubbleCreateError, extractReviewerFocus };

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  return runCreateBubbleFlow(input, {
    ...dependencies,
    assertGitRepository:
      dependencies.assertGitRepository ?? assertGitRepository,
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope
  });
}
