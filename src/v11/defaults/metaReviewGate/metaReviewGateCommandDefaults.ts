import { readFile } from "node:fs/promises";

import { buildAgentCommand } from "../../shared/command/agentCommand.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import { setMetaReviewerPaneBinding } from "../../infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import {
  respawnTmuxPaneCommand,
  runTmux
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "../../infrastructure/channel/tmux/tmuxInput.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies
} from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  NotifyMetaReviewerSubmissionRequestDependencies,
  ResolveMetaReviewerPaneWarningInput
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";

type MetaReviewGateDependencyDefaults = {
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
};

export const metaReviewGateDependencyDefaults = {
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
  writeStateSnapshot
} as const satisfies MetaReviewGateDependencyDefaults;
