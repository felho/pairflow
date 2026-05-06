import { resolveDocContractGateArtifactPath } from "../gates/docContractGateArtifactDefaults.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import {
  inspectStateSnapshot,
  readStateSnapshot
} from "../state/stateStoreDefaults.js";
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
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
import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type {
  PairflowGlobalConfig
} from "../../../config/pairflowConfig.js";
import type {
  ResolveRemoteBubbleStatusTargetPort
} from "../remote/commitRemoteExecution.js";
import type {
  RemoteBubbleStatusSnapshot,
  RemoteBubbleStatusTarget
} from "./remoteBubbleStatusContract.js";

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
type ReadRemotePointerPort = (
  path: string
) => Promise<BubbleRemotePointer | null>;
type ReadRemoteStateCachePort = (
  path: string
) => Promise<BubbleRemoteStateCache | null>;
type WriteRemoteStateCachePort = (
  path: string,
  value: BubbleRemoteStateCache
) => Promise<void>;
type ExecuteRemoteBubbleStatusPort = (input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
}) => Promise<RemoteBubbleStatusSnapshot>;
type LoadPairflowGlobalConfigPort = () => Promise<PairflowGlobalConfig>;

interface ListCommandDefaultsModule {
  listCommandDefaults: {
    executeRemoteBubbleStatus: ExecuteRemoteBubbleStatusPort;
    loadPairflowGlobalConfig: LoadPairflowGlobalConfigPort;
    readRemotePointer: ReadRemotePointerPort;
    readRemoteStateCache: ReadRemoteStateCachePort;
    resolveRemoteBubbleStatusTarget: ResolveRemoteBubbleStatusTargetPort;
    writeRemoteStateCache: WriteRemoteStateCachePort;
  };
}

interface DocContractGateArtifactDefaultsModule {
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
}

interface ReviewVerificationArtifactDefaultsModule {
  readReviewVerificationArtifactStatus:
    ReadReviewVerificationArtifactStatusResult;
}

let listCommandDefaultsModulePromise:
  | Promise<ListCommandDefaultsModule>
  | undefined;

let docContractGateArtifactDefaultsModulePromise:
  | Promise<DocContractGateArtifactDefaultsModule>
  | undefined;

let reviewVerificationArtifactDefaultsModulePromise:
  | Promise<ReviewVerificationArtifactDefaultsModule>
  | undefined;

function getListCommandDefaultsModulePath(): string {
  return "../../defaults/list/listCommandDefaults.js";
}

function getDocContractGateArtifactDefaultsModulePath(): string {
  return "../../defaults/gates/docContractGateArtifactDefaults.js";
}

function getReviewVerificationArtifactDefaultsModulePath(): string {
  return "../../defaults/reviewer/reviewVerificationArtifactDefaults.js";
}

async function loadListCommandDefaultsModule():
  Promise<ListCommandDefaultsModule> {
  listCommandDefaultsModulePromise ??= import(
    getListCommandDefaultsModulePath()
  ) as Promise<ListCommandDefaultsModule>;
  return listCommandDefaultsModulePromise;
}

async function loadDocContractGateArtifactDefaultsModule():
  Promise<DocContractGateArtifactDefaultsModule> {
  docContractGateArtifactDefaultsModulePromise ??= import(
    getDocContractGateArtifactDefaultsModulePath()
  ) as Promise<DocContractGateArtifactDefaultsModule>;
  return docContractGateArtifactDefaultsModulePromise;
}

async function loadReviewVerificationArtifactDefaultsModule():
  Promise<ReviewVerificationArtifactDefaultsModule> {
  reviewVerificationArtifactDefaultsModulePromise ??= import(
    getReviewVerificationArtifactDefaultsModulePath()
  ) as Promise<ReviewVerificationArtifactDefaultsModule>;
  return reviewVerificationArtifactDefaultsModulePromise;
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
  const {
    readReviewVerificationArtifactStatus:
      readReviewVerificationArtifactStatusDefault
  } = await loadReviewVerificationArtifactDefaultsModule();
  return readReviewVerificationArtifactStatusDefault(...args);
}

const statusCommandDependencyDefaultsPromise = loadListCommandDefaultsModule()
  .then(({ listCommandDefaults }) => ({
    executeRemoteBubbleStatus: listCommandDefaults.executeRemoteBubbleStatus,
    inspectStateSnapshot: inspectStateSnapshotForStatus,
    loadPairflowGlobalConfig: listCommandDefaults.loadPairflowGlobalConfig,
    readDocContractGateArtifact,
    readRemotePointer: listCommandDefaults.readRemotePointer,
    readRemoteStateCache: listCommandDefaults.readRemoteStateCache,
    readReviewVerificationArtifactStatus:
      readReviewVerificationArtifactStatusForStatus,
    readStateSnapshot,
    readTranscriptEnvelopes,
    resolveRemoteBubbleStatusTarget:
      listCommandDefaults.resolveRemoteBubbleStatusTarget,
    resolveBubbleById,
    resolveDocContractGateArtifactPath,
    writeRemoteStateCache: listCommandDefaults.writeRemoteStateCache
  }));

export const statusCommandDependencyDefaults =
  await statusCommandDependencyDefaultsPromise;
