import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { assertGitRepository } from "../../v11/infrastructure/workspace/git.js";

export const createBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  assertGitRepository
} as const;
