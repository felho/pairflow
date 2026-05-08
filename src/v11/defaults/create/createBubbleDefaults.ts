import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import "../converged/convergedDependencyDefaults.js";
import "../metrics/bubbleEvents.js";
import "../start/startBubbleDefaults.js";
import { appendProtocolEnvelope } from "../../infrastructure/artifact/transcript/transcriptStore.js";
import { writeDocContractGateArtifact } from "../../infrastructure/artifact/gates/docContractGateArtifacts.js";
import {
  resolveDocContractGateArtifactPath
} from "../../shared/gates/docContractGateArtifactPath.js";
import { writeRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { assertGitRepository } from "../../infrastructure/workspace/git.js";

export const createBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  assertGitRepository,
  loadPairflowGlobalConfig,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact,
  writeRemotePointer
} as const;
