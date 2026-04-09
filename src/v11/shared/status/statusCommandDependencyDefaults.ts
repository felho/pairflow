import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type {
  StateValidationDiagnostics
} from "../ports/stateSnapshots.js";
import type {
  ReadReviewVerificationArtifactStatusPort,
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

type InspectStateSnapshot = (
  statePath: string
) => Promise<StatusInboxInspectionResult>;
type StatusInboxDependencyDefaults = {
  resolveBubbleById: ResolveBubbleByIdPort;
  inspectStateSnapshot: InspectStateSnapshot;
};
type StatusGateDefaults = {
  readReviewVerificationArtifactStatus: ReadReviewVerificationArtifactStatus;
};
type ReadReviewVerificationArtifactStatus = ReadReviewVerificationArtifactStatusPort;
type ReadReviewVerificationArtifactStatusResult = (
  artifactPath: string,
  options?: ReadReviewVerificationArtifactStatusOptions
) => Promise<ReviewVerificationArtifactStatus>;

let statusInboxDependencyDefaultsPromise:
  | Promise<StatusInboxDependencyDefaults>
  | undefined;
let statusGateDefaultsPromise:
  | Promise<StatusGateDefaults>
  | undefined;

async function loadStatusInboxDependencyDefaults(): Promise<StatusInboxDependencyDefaults> {
  statusInboxDependencyDefaultsPromise ??= import(
    "../../../core/bubble/statusInboxDefaults.js"
  ).then(({ statusInboxDependencyDefaults }) => {
    const { resolveBubbleById, inspectStateSnapshot } =
      statusInboxDependencyDefaults;
    return {
      resolveBubbleById,
      inspectStateSnapshot
    };
  });
  return statusInboxDependencyDefaultsPromise;
}

async function loadStatusGateDefaults(): Promise<StatusGateDefaults> {
  statusGateDefaultsPromise ??= import(
    "../../../core/bubble/statusGateDefaults.js"
  ).then(({ statusGateDefaults }) => {
    const { readReviewVerificationArtifactStatus } = statusGateDefaults;
    return { readReviewVerificationArtifactStatus };
  });
  return statusGateDefaultsPromise;
}

async function resolveBubbleById(
  ...args: Parameters<ResolveBubbleByIdPort>
): Promise<Awaited<ReturnType<ResolveBubbleByIdPort>>> {
  const defaults = await loadStatusInboxDependencyDefaults();
  return defaults.resolveBubbleById(...args);
}

async function inspectStateSnapshot(
  ...args: Parameters<InspectStateSnapshot>
): Promise<Awaited<ReturnType<InspectStateSnapshot>>> {
  const defaults = await loadStatusInboxDependencyDefaults();
  return defaults.inspectStateSnapshot(...args);
}

async function readReviewVerificationArtifactStatus(
  ...args: Parameters<ReadReviewVerificationArtifactStatusResult>
): Promise<Awaited<ReturnType<ReadReviewVerificationArtifactStatusResult>>> {
  const defaults = await loadStatusGateDefaults();
  return defaults.readReviewVerificationArtifactStatus(...args);
}

export const statusCommandDependencyDefaults = {
  inspectStateSnapshot,
  readDocContractGateArtifact,
  readReviewVerificationArtifactStatus,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  resolveDocContractGateArtifactPath
} as const;
