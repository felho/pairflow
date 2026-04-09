import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  RecoverMetaReviewGateFromSnapshotDependencies
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  NotifyMetaReviewerSubmissionRequestDependencies,
  ResolveMetaReviewerPaneWarningInput
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";

interface MetaReviewGateDependencyDefaults {
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

async function loadMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  metaReviewGateDependencyDefaultsPromise ??= import(
    "../../../core/bubble/metaReviewGateDefaults.js"
  ).then(({ metaReviewGateDependencyDefaults }) => ({
    appendProtocolEnvelope:
      metaReviewGateDependencyDefaults.appendProtocolEnvelope,
    buildAgentCommand: metaReviewGateDependencyDefaults.buildAgentCommand,
    maybeAcceptClaudeTrustPrompt:
      metaReviewGateDependencyDefaults.maybeAcceptClaudeTrustPrompt,
    readFile: metaReviewGateDependencyDefaults.readFile,
    readTranscriptEnvelopes:
      metaReviewGateDependencyDefaults.readTranscriptEnvelopes,
    readStateSnapshot: metaReviewGateDependencyDefaults.readStateSnapshot,
    respawnTmuxPaneCommand:
      metaReviewGateDependencyDefaults.respawnTmuxPaneCommand,
    resolveBubbleById: metaReviewGateDependencyDefaults.resolveBubbleById,
    runTmux: metaReviewGateDependencyDefaults.runTmux,
    sendAndSubmitTmuxPaneMessage:
      metaReviewGateDependencyDefaults.sendAndSubmitTmuxPaneMessage,
    setMetaReviewerPaneBinding:
      metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
    submitTmuxPaneInput:
      metaReviewGateDependencyDefaults.submitTmuxPaneInput,
    writeFile: metaReviewGateDependencyDefaults.writeFile,
    writeStateSnapshot: metaReviewGateDependencyDefaults.writeStateSnapshot
  }));
  return metaReviewGateDependencyDefaultsPromise;
}

export async function resolveMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  return loadMetaReviewGateDependencyDefaults();
}
