import { readFile } from "node:fs/promises";

import { metaReviewGateDependencyDefaults as metaReviewGateDependencyDefaultsV11 } from "../../defaults/metaReviewGate/metaReviewGateCommandDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies
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
    ...metaReviewGateDependencyDefaultsV11,
    appendProtocolEnvelope,
    readFile,
    readTranscriptEnvelopes,
    readStateSnapshot,
    writeStateSnapshot
  });
  return metaReviewGateDependencyDefaultsPromise;
}
