import { resolveDocContractGateArtifactPath } from "../gates/docContractGateArtifactDefaults.js";
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
  ReadDocContractGateArtifactPort
} from "../ports/docContractGateArtifacts.js";
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

interface DocContractGateArtifactDefaultsModule {
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
}

let docContractGateArtifactDefaultsModulePromise:
  | Promise<DocContractGateArtifactDefaultsModule>
  | undefined;

function getDocContractGateArtifactDefaultsModulePath(): string {
  return "../../defaults/gates/docContractGateArtifactDefaults.js";
}

async function loadDocContractGateArtifactDefaultsModule():
  Promise<DocContractGateArtifactDefaultsModule> {
  docContractGateArtifactDefaultsModulePromise ??= import(
    getDocContractGateArtifactDefaultsModulePath()
  ) as Promise<DocContractGateArtifactDefaultsModule>;
  return docContractGateArtifactDefaultsModulePromise;
}

const readDocContractGateArtifact:
  ReadDocContractGateArtifactPort = async (...args) => {
    const { readDocContractGateArtifact: readDocContractGateArtifactDefault } =
      await loadDocContractGateArtifactDefaultsModule();
    return readDocContractGateArtifactDefault(...args);
  };

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

const statusCommandDependencyDefaultsPromise = import(
  "../../defaults/list/listCommandDefaults.js"
).then(({ listCommandDefaults }) => ({
  executeRemoteBubbleStatus: listCommandDefaults.executeRemoteBubbleStatus,
  inspectStateSnapshot: inspectStateSnapshotForStatus,
  loadPairflowGlobalConfig: listCommandDefaults.loadPairflowGlobalConfig,
  readDocContractGateArtifact,
  readRemotePointer: listCommandDefaults.readRemotePointer,
  readRemoteStateCache: listCommandDefaults.readRemoteStateCache,
  readReviewVerificationArtifactStatus: readReviewVerificationArtifactStatusForStatus,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveRemoteBubbleStatusTarget: listCommandDefaults.resolveRemoteBubbleStatusTarget,
  resolveBubbleById,
  resolveDocContractGateArtifactPath,
  writeRemoteStateCache: listCommandDefaults.writeRemoteStateCache
}));

export const statusCommandDependencyDefaults =
  await statusCommandDependencyDefaultsPromise;
