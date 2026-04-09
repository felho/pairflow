import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { assertGitRepository } from "../workspace/git.js";

export const createBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  assertGitRepository
} as const;
