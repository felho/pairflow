import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";

type InspectStateSnapshot =
  typeof import("../../infrastructure/state/stateStore.js").inspectStateSnapshot;
type ReadReviewVerificationArtifactStatus =
  typeof import("../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js").readReviewVerificationArtifactStatus;

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
    "../../infrastructure/executor/workspace/bubbleLookup.js"
  ).then(async ({ resolveBubbleById }) => {
    const { inspectStateSnapshot } = await import(
      "../../infrastructure/state/stateStore.js"
    );
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
    "../../infrastructure/artifact/reviewer/reviewVerificationArtifacts.js"
  ).then(({ readReviewVerificationArtifactStatus }) => ({
    readReviewVerificationArtifactStatus
  }));
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
): Promise<
  Awaited<ReturnType<ReadReviewVerificationArtifactStatus>>
> {
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
