import {
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";

type StatusInboxDependencyDefaults =
  typeof import("../../../core/bubble/statusInboxDefaults.js").statusInboxDependencyDefaults;
type StatusGateDefaults =
  typeof import("../../../core/bubble/statusGateDefaults.js").statusGateDefaults;

let statusInboxDependencyDefaultsPromise:
  | Promise<StatusInboxDependencyDefaults>
  | undefined;
let statusGateDefaultsPromise: Promise<StatusGateDefaults> | undefined;

async function loadStatusInboxDependencyDefaults(): Promise<StatusInboxDependencyDefaults> {
  statusInboxDependencyDefaultsPromise ??= import(
    "../../../core/bubble/statusInboxDefaults.js"
  ).then(({ statusInboxDependencyDefaults }) => statusInboxDependencyDefaults);
  return statusInboxDependencyDefaultsPromise;
}

async function loadStatusGateDefaults(): Promise<StatusGateDefaults> {
  statusGateDefaultsPromise ??= import(
    "../../../core/bubble/statusGateDefaults.js"
  ).then(({ statusGateDefaults }) => statusGateDefaults);
  return statusGateDefaultsPromise;
}

async function resolveBubbleById(
  ...args: Parameters<StatusInboxDependencyDefaults["resolveBubbleById"]>
): Promise<Awaited<ReturnType<StatusInboxDependencyDefaults["resolveBubbleById"]>>> {
  const defaults = await loadStatusInboxDependencyDefaults();
  return defaults.resolveBubbleById(...args);
}

async function inspectStateSnapshot(
  ...args: Parameters<StatusInboxDependencyDefaults["inspectStateSnapshot"]>
): Promise<Awaited<ReturnType<StatusInboxDependencyDefaults["inspectStateSnapshot"]>>> {
  const defaults = await loadStatusInboxDependencyDefaults();
  return defaults.inspectStateSnapshot(...args);
}

async function readReviewVerificationArtifactStatus(
  ...args: Parameters<StatusGateDefaults["readReviewVerificationArtifactStatus"]>
): Promise<
  Awaited<ReturnType<StatusGateDefaults["readReviewVerificationArtifactStatus"]>>
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
