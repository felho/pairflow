import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type { InspectedStateSnapshot } from "../../infrastructure/state/stateSnapshotInspection.js";
import type {
  ReadReviewVerificationArtifactStatusOptions
} from "../ports/reviewVerificationArtifacts.js";
import type {
  ReviewVerificationArtifactStatus
} from "../reviewer/reviewVerification.js";

type InspectStateSnapshot = (
  statePath: string
) => Promise<InspectedStateSnapshot>;
type ReadReviewVerificationArtifactStatus = (
  artifactPath: string,
  options?: ReadReviewVerificationArtifactStatusOptions
) => Promise<ReviewVerificationArtifactStatus>;

let statusInboxDependencyDefaultsPromise:
  | Promise<{
      resolveBubbleById: ResolveBubbleByIdPort;
      inspectStateSnapshot: InspectStateSnapshot;
    }>
  | undefined;
let statusGateDefaultsPromise:
  | Promise<{
      readReviewVerificationArtifactStatus: ReadReviewVerificationArtifactStatus;
    }>
  | undefined;

async function loadStatusInboxDependencyDefaults(): Promise<{
  resolveBubbleById: ResolveBubbleByIdPort;
  inspectStateSnapshot: InspectStateSnapshot;
}> {
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

async function loadStatusGateDefaults(): Promise<{
  readReviewVerificationArtifactStatus: ReadReviewVerificationArtifactStatus;
}> {
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
  ...args: Parameters<ReadReviewVerificationArtifactStatus>
): Promise<Awaited<ReturnType<ReadReviewVerificationArtifactStatus>>> {
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
