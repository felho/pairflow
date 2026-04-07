import type {
  MetaReviewLiveRunnerInput,
  MetaReviewLiveRunnerOutput
} from "./metaReviewLiveRunContract.js";
import { resolveMetaReviewRunnerMode } from "./metaReviewLiveRunnerConfig.js";
import {
  runCodexAgentLiveReview,
  runCodexPaneLiveReview
} from "./metaReviewLiveRunnerRuntime.js";

export async function defaultLiveRunner(
  input: MetaReviewLiveRunnerInput
): Promise<MetaReviewLiveRunnerOutput> {
  const mode = resolveMetaReviewRunnerMode();
  if (mode === "unavailable") {
    throw new Error("Meta-review runner adapter is unavailable.");
  }
  if (mode === "agent") {
    return runCodexAgentLiveReview(input);
  }
  return runCodexPaneLiveReview(input);
}

export {
  parseMetaReviewRunnerOutput,
  extractMetaReviewDelimitedBlock
} from "./metaReviewLiveRunnerParsing.js";
