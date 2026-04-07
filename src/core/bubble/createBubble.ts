import { appendProtocolEnvelope } from "../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { assertGitRepository } from "../../v11/infrastructure/workspace/git.js";
import { extractReviewerFocus } from "../../v11/application/create/createReviewerFocus.js";
import { BubbleCreateError } from "../../v11/application/create/createCommandRuntime.js";
import { runCreateBubbleFlow } from "../../v11/application/create/runCreateBubbleFlow.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "../../v11/application/create/createCommandContract.js";

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
export type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "../../v11/application/create/createCommandContract.js";
