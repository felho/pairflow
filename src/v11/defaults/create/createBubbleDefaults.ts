import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import { appendProtocolEnvelope } from "../../shared/transcript/transcriptDependencyDefaults.js";
import { assertGitRepository } from "../../infrastructure/workspace/git.js";

export const createBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  assertGitRepository,
  loadPairflowGlobalConfig
} as const;
