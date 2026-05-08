import { join } from "node:path";

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

interface BubbleLookupDefaultsModule {
  resolveBubbleById: ResolveBubbleByIdPort;
}

interface StateStoreDefaultsModule {
  inspectStateSnapshot: (
    statePath: string
  ) => Promise<InspectedStateSnapshot>;
  readStateSnapshot: ReadStateSnapshotPort;
}

interface TranscriptDependencyDefaultsModule {
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
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
let bubbleLookupDefaultsModulePromise:
  | Promise<BubbleLookupDefaultsModule>
  | undefined;
let stateStoreDefaultsModulePromise:
  | Promise<StateStoreDefaultsModule>
  | undefined;
let transcriptDependencyDefaultsModulePromise:
  | Promise<TranscriptDependencyDefaultsModule>
  | undefined;

let docContractGateArtifactDefaultsModulePromise:
  | Promise<DocContractGateArtifactDefaultsModule>
  | undefined;

let reviewVerificationArtifactsModulePromise:
  | Promise<ReviewVerificationArtifactDefaultsModule>
  | undefined;

function getListCommandDefaultsModulePath(): string {
  return "../../defaults/list/listCommandDefaults.js";
}

function getBubbleLookupDefaultsModulePath(): string {
  return "../../defaults/bubbleLookup/bubbleLookupDefaults.js";
}

function getStateStoreDefaultsModulePath(): string {
  return "../../defaults/state/stateStoreDefaults.js";
}

function getTranscriptDependencyDefaultsModulePath(): string {
  return "../../defaults/transcript/transcriptDependencyDefaults.js";
}

function getDocContractGateArtifactDefaultsModulePath(): string {
  return "../../defaults/gates/docContractGateArtifactDefaults.js";
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

async function loadBubbleLookupDefaultsModule():
  Promise<BubbleLookupDefaultsModule> {
  bubbleLookupDefaultsModulePromise ??= import(
    getBubbleLookupDefaultsModulePath()
  ) as Promise<BubbleLookupDefaultsModule>;
  return bubbleLookupDefaultsModulePromise;
}

async function loadStateStoreDefaultsModule():
  Promise<StateStoreDefaultsModule> {
  stateStoreDefaultsModulePromise ??= import(
    getStateStoreDefaultsModulePath()
  ) as Promise<StateStoreDefaultsModule>;
  return stateStoreDefaultsModulePromise;
}

async function loadTranscriptDependencyDefaultsModule():
  Promise<TranscriptDependencyDefaultsModule> {
  transcriptDependencyDefaultsModulePromise ??= import(
    getTranscriptDependencyDefaultsModulePath()
  ) as Promise<TranscriptDependencyDefaultsModule>;
  return transcriptDependencyDefaultsModulePromise;
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
    await loadBubbleLookupDefaultsModule();
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
    resolveDocContractGateArtifactPath: (artifactsDir: string): string =>
      join(artifactsDir, "doc-contract-gates.json"),
    writeRemoteStateCache: listCommandDefaults.writeRemoteStateCache
  }));

export const statusCommandDependencyDefaults =
  await statusCommandDependencyDefaultsPromise;
