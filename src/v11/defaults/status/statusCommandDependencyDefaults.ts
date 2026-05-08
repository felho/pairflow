import { resolveDocContractGateArtifactPath } from "../../shared/gates/docContractGateArtifactPath.js";
import { readWatchdogPaneActivity } from "../watchdog/watchdogPaneActivityDefaults.js";
import type {
  InspectedStateSnapshot,
  ReadStateSnapshotPort,
  StateValidationDiagnostics
} from "../../ports/stateSnapshots.js";
import type { ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";
import type {
  ReadReviewVerificationArtifactStatusOptions
} from "../../ports/reviewVerificationArtifacts.js";
import type {
  ReadDocContractGateArtifactPort
} from "../../ports/docContractGateArtifacts.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  BubbleStatusState
} from "../../shared/status/statusCommandTypes.js";
import type {
  ReviewVerificationArtifactStatus
} from "../../shared/reviewer/reviewVerification.js";
import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type { BubbleRemoteStateCache } from "../../shared/remote/remoteStateCacheTypes.js";
import type {
  PairflowGlobalConfig
} from "../../../config/pairflowConfig.js";
import type {
  ResolveRemoteBubbleStatusTargetPort
} from "../../shared/remote/commitRemoteExecution.js";
import type {
  RemoteBubbleStatusSnapshot,
  RemoteBubbleStatusTarget
} from "../../shared/status/remoteBubbleStatusContract.js";

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

interface BubbleLookupModule {
  resolveBubbleById: ResolveBubbleByIdPort;
}

interface StateStoreModule {
  inspectStateSnapshot: (
    statePath: string
  ) => Promise<InspectedStateSnapshot>;
  readStateSnapshot: ReadStateSnapshotPort;
}

interface TranscriptStoreModule {
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
}

interface DocContractGateArtifactsModule {
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
}

interface ReviewVerificationArtifactDefaultsModule {
  readReviewVerificationArtifactStatus:
    ReadReviewVerificationArtifactStatusResult;
}

let listCommandDefaultsModulePromise:
  | Promise<ListCommandDefaultsModule>
  | undefined;
let bubbleLookupModulePromise:
  | Promise<BubbleLookupModule>
  | undefined;
let stateStoreModulePromise:
  | Promise<StateStoreModule>
  | undefined;
let transcriptStoreModulePromise:
  | Promise<TranscriptStoreModule>
  | undefined;

let docContractGateArtifactsModulePromise:
  | Promise<DocContractGateArtifactsModule>
  | undefined;

let reviewVerificationArtifactsModulePromise:
  | Promise<ReviewVerificationArtifactDefaultsModule>
  | undefined;

function getListCommandDefaultsModulePath(): string {
  return "../list/listCommandDefaults.js";
}

function getBubbleLookupModulePath(): string {
  return "../../infrastructure/executor/workspace/bubbleLookup.js";
}

function getStateStoreDefaultsModulePath(): string {
  return "../../infrastructure/state/stateStore.js";
}

function getTranscriptDependencyDefaultsModulePath(): string {
  return "../../infrastructure/artifact/transcript/transcriptStore.js";
}

function getDocContractGateArtifactDefaultsModulePath(): string {
  return "../../infrastructure/artifact/gates/docContractGateArtifacts.js";
}

function getReviewVerificationArtifactDefaultsModulePath(): string {
  return "../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js";
}

async function loadListCommandDefaultsModule():
  Promise<ListCommandDefaultsModule> {
  listCommandDefaultsModulePromise ??= import(
    getListCommandDefaultsModulePath()
  ) as Promise<ListCommandDefaultsModule>;
  return listCommandDefaultsModulePromise;
}

async function loadBubbleLookupModule():
  Promise<BubbleLookupModule> {
  bubbleLookupModulePromise ??= import(
    getBubbleLookupModulePath()
  ) as Promise<BubbleLookupModule>;
  return bubbleLookupModulePromise;
}

async function loadStateStoreDefaultsModule():
  Promise<StateStoreModule> {
  stateStoreModulePromise ??= import(
    getStateStoreDefaultsModulePath()
  ) as Promise<StateStoreModule>;
  return stateStoreModulePromise;
}

async function loadTranscriptDependencyDefaultsModule():
  Promise<TranscriptStoreModule> {
  transcriptStoreModulePromise ??= import(
    getTranscriptDependencyDefaultsModulePath()
  ) as Promise<TranscriptStoreModule>;
  return transcriptStoreModulePromise;
}

async function loadDocContractGateArtifactDefaultsModule():
  Promise<DocContractGateArtifactsModule> {
  docContractGateArtifactsModulePromise ??= import(
    getDocContractGateArtifactDefaultsModulePath()
  ) as Promise<DocContractGateArtifactsModule>;
  return docContractGateArtifactsModulePromise;
}

async function loadReviewVerificationArtifactDefaultsModule():
  Promise<ReviewVerificationArtifactDefaultsModule> {
  reviewVerificationArtifactsModulePromise ??= import(
    getReviewVerificationArtifactDefaultsModulePath()
  ) as Promise<ReviewVerificationArtifactDefaultsModule>;
  return reviewVerificationArtifactsModulePromise;
}

const readDocContractGateArtifact:
  ReadDocContractGateArtifactPort = async (...args) => {
    const { readDocContractGateArtifact: readDocContractGateArtifactDefault } =
      await loadDocContractGateArtifactDefaultsModule();
    return readDocContractGateArtifactDefault(...args);
  };

const readStateSnapshot: ReadStateSnapshotPort = async (...args) => {
  const { readStateSnapshot: readStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return readStateSnapshotDefault(...args);
};

const readTranscriptEnvelopes: ReadTranscriptEnvelopesPort = async (...args) => {
  const { readTranscriptEnvelopes: readTranscriptEnvelopesDefault } =
    await loadTranscriptDependencyDefaultsModule();
  return readTranscriptEnvelopesDefault(...args);
};

const resolveBubbleById: ResolveBubbleByIdPort = async (...args) => {
  const { resolveBubbleById: resolveBubbleByIdDefault } =
    await loadBubbleLookupModule();
  return resolveBubbleByIdDefault(...args);
};

async function inspectStateSnapshotForStatus(
  ...args: Parameters<InspectStateSnapshot>
): Promise<StatusInboxInspectionResult> {
  const { inspectStateSnapshot } = await loadStateStoreDefaultsModule();
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
    readWatchdogPaneActivity,
    resolveRemoteBubbleStatusTarget:
      listCommandDefaults.resolveRemoteBubbleStatusTarget,
    resolveBubbleById,
    resolveDocContractGateArtifactPath,
    writeRemoteStateCache: listCommandDefaults.writeRemoteStateCache
  }));

export const statusCommandDependencyDefaults =
  await statusCommandDependencyDefaultsPromise;
