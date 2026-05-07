import { extractReviewerFocus } from "./createReviewerFocus.js";
import { BubbleCreateError } from "./createCommandRuntime.js";
import { createBubbleDefaults } from "./createBubbleDefaults.js";
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
      dependencies.assertGitRepository ?? createBubbleDefaults.assertGitRepository,
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope ?? createBubbleDefaults.appendProtocolEnvelope,
    loadPairflowGlobalConfig:
      dependencies.loadPairflowGlobalConfig ?? createBubbleDefaults.loadPairflowGlobalConfig,
    resolveDocContractGateArtifactPath:
      dependencies.resolveDocContractGateArtifactPath
      ?? createBubbleDefaults.resolveDocContractGateArtifactPath,
    writeDocContractGateArtifact:
      dependencies.writeDocContractGateArtifact
      ?? createBubbleDefaults.writeDocContractGateArtifact,
    writeRemotePointer:
      dependencies.writeRemotePointer ?? createBubbleDefaults.writeRemotePointer
  });
}
