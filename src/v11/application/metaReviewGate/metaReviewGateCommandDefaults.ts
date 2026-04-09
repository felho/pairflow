import { readFile, writeFile } from "node:fs/promises";

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
  metaReviewGateDependencyDefaultsPromise ??= Promise.all([
    import("../../infrastructure/executor/command/agentCommand.js"),
    import("../../infrastructure/channel/tmux/tmuxInput.js"),
    import("../../infrastructure/executor/workspace/bubbleLookup.js"),
    import("../../infrastructure/channel/tmux/tmuxManager.js"),
    import("../../infrastructure/channel/tmux/metaReviewerPaneBinding.js")
  ]).then(
    ([
      { buildAgentCommand },
      {
        maybeAcceptClaudeTrustPrompt,
        sendAndSubmitTmuxPaneMessage,
        submitTmuxPaneInput
      },
      { resolveBubbleById },
      { runTmux, respawnTmuxPaneCommand },
      { setMetaReviewerPaneBinding }
    ]) => ({
      appendProtocolEnvelope,
      buildAgentCommand,
      maybeAcceptClaudeTrustPrompt,
      readFile,
      readTranscriptEnvelopes,
      readStateSnapshot,
      respawnTmuxPaneCommand,
      resolveBubbleById,
      runTmux,
      sendAndSubmitTmuxPaneMessage,
      setMetaReviewerPaneBinding,
      submitTmuxPaneInput,
      writeFile,
      writeStateSnapshot
    })
  );
  return metaReviewGateDependencyDefaultsPromise;
}
