import { readFile, writeFile } from "node:fs/promises";

import { metaReviewGateDependencyDefaults as metaReviewGateDependencyDefaultsCore } from "../../../core/bubble/metaReviewGateDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  RecoverMetaReviewGateFromSnapshotDependencies
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  NotifyMetaReviewerSubmissionRequestDependencies,
  ResolveMetaReviewerPaneWarningInput
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";

export interface MetaReviewGateDependencyDefaults {
  appendProtocolEnvelope:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["appendProtocolEnvelope"]>;
  buildAgentCommand:
    NonNullable<ResolveMetaReviewerPaneWarningInput["buildAgentCommand"]>;
  maybeAcceptClaudeTrustPrompt:
    NonNullable<
      NotifyMetaReviewerSubmissionRequestDependencies["maybeAcceptClaudeTrustPrompt"]
    >;
  readFile: NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readFile"]>;
  readTranscriptEnvelopes:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readTranscriptEnvelopes"]>;
  readStateSnapshot:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readStateSnapshot"]>;
  respawnTmuxPaneCommand:
    NonNullable<ResolveMetaReviewerPaneWarningInput["respawnTmuxPaneCommand"]>;
  resolveBubbleById:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveBubbleById"]>;
  runTmux:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["runTmux"]>;
  sendAndSubmitTmuxPaneMessage:
    NonNullable<
      NotifyMetaReviewerSubmissionRequestDependencies["sendAndSubmitTmuxPaneMessage"]
    >;
  setMetaReviewerPaneBinding:
    NonNullable<
      ApplyMetaReviewGateOnConvergenceDependencies["setMetaReviewerPaneBinding"]
    >;
  submitTmuxPaneInput:
    NonNullable<
      NotifyMetaReviewerSubmissionRequestDependencies["submitTmuxPaneInput"]
    >;
  writeFile:
    NonNullable<RecoverMetaReviewGateFromSnapshotDependencies["writeFile"]>;
  writeStateSnapshot:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["writeStateSnapshot"]>;
}

let metaReviewGateDependencyDefaultsPromise:
  | Promise<MetaReviewGateDependencyDefaults>
  | undefined;

export async function loadMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  metaReviewGateDependencyDefaultsPromise ??= Promise.resolve({
    ...metaReviewGateDependencyDefaultsCore,
    appendProtocolEnvelope,
    readFile,
    readTranscriptEnvelopes,
    readStateSnapshot,
    writeFile,
    writeStateSnapshot
  });
  return metaReviewGateDependencyDefaultsPromise;
}
