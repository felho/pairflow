import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { assertGitRepository } from "../../../core/workspace/git.js";
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
