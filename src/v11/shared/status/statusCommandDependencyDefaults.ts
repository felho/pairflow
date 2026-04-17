import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import {
  readRemotePointer,
  readRemoteStateCache,
  writeRemoteStateCache
} from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import {
  executeRemoteBubbleStatus,
  resolveRemoteBubbleStatusTarget
} from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import {
  inspectStateSnapshot,
  readStateSnapshot
} from "../state/stateStoreDefaults.js";
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import {
  readReviewVerificationArtifactStatus
} from "../../defaults/reviewer/reviewVerificationArtifactDefaults.js";
import type {
  InspectedStateSnapshot,
  StateValidationDiagnostics
} from "../ports/stateSnapshots.js";
import type {
  ReadReviewVerificationArtifactStatusOptions
} from "../ports/reviewVerificationArtifacts.js";
import type {
  BubbleStatusState
} from "./statusCommandTypes.js";
import type {
  ReviewVerificationArtifactStatus
} from "../reviewer/reviewVerification.js";

interface StatusInboxInspectionResult {
  state: BubbleStatusState;
  fingerprint: string;
  stateValidation: StateValidationDiagnostics | null;
}

type ReadReviewVerificationArtifactStatusResult = (
  artifactPath: string,
  options?: ReadReviewVerificationArtifactStatusOptions
) => Promise<ReviewVerificationArtifactStatus>;
type InspectStateSnapshot = (
  statePath: string
) => Promise<InspectedStateSnapshot>;

async function inspectStateSnapshotForStatus(
  ...args: Parameters<InspectStateSnapshot>
): Promise<StatusInboxInspectionResult> {
  const inspected = await inspectStateSnapshot(...args);
  return {
    fingerprint: inspected.fingerprint,
    state: inspected.state,
    stateValidation: inspected.stateValidation
  };
}

async function readReviewVerificationArtifactStatusForStatus(
  ...args: Parameters<ReadReviewVerificationArtifactStatusResult>
): Promise<Awaited<ReturnType<ReadReviewVerificationArtifactStatusResult>>> {
  return readReviewVerificationArtifactStatus(...args);
}

export const statusCommandDependencyDefaults = {
  executeRemoteBubbleStatus,
  inspectStateSnapshot: inspectStateSnapshotForStatus,
  loadPairflowGlobalConfig,
  readDocContractGateArtifact,
  readRemotePointer,
  readRemoteStateCache,
  readReviewVerificationArtifactStatus: readReviewVerificationArtifactStatusForStatus,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveRemoteBubbleStatusTarget,
  resolveBubbleById,
  resolveDocContractGateArtifactPath,
  writeRemoteStateCache
} as const;
