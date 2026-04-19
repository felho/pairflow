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
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";

export interface MetaReviewGateDependencyDefaults {
  appendProtocolEnvelope:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["appendProtocolEnvelope"]>;
  readFile: NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readFile"]>;
  readTranscriptEnvelopes:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readTranscriptEnvelopes"]>;
  readStateSnapshot:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readStateSnapshot"]>;
  resolveBubbleById:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveBubbleById"]>;
  setMetaReviewerPaneBinding:
    NonNullable<
      ApplyMetaReviewGateOnConvergenceDependencies["setMetaReviewerPaneBinding"]
    >;
  runtime: {
    notify: {
      runTmux: NonNullable<MetaReviewGateNotifyRuntimeCapabilities["runTmux"]>;
      maybeAcceptClaudeTrustPrompt:
        NonNullable<
          MetaReviewGateNotifyRuntimeCapabilities["maybeAcceptClaudeTrustPrompt"]
        >;
      sendAndSubmitTmuxPaneMessage:
        NonNullable<
          MetaReviewGateNotifyRuntimeCapabilities["sendAndSubmitTmuxPaneMessage"]
        >;
      submitTmuxPaneInput:
        NonNullable<MetaReviewGateNotifyRuntimeCapabilities["submitTmuxPaneInput"]>;
    };
    paneBinding: {
      runTmux: NonNullable<MetaReviewGatePaneBindingRuntimeCapabilities["runTmux"]>;
      buildAgentCommand:
        NonNullable<MetaReviewGatePaneBindingRuntimeCapabilities["buildAgentCommand"]>;
      respawnTmuxPaneCommand:
        NonNullable<
          MetaReviewGatePaneBindingRuntimeCapabilities["respawnTmuxPaneCommand"]
        >;
    };
  };
  writeStateSnapshot:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["writeStateSnapshot"]>;
}

export const metaReviewGateDependencyDefaults = {
  appendProtocolEnvelope,
  readFile,
  readTranscriptEnvelopes,
  readStateSnapshot,
  resolveBubbleById,
  setMetaReviewerPaneBinding,
  runtime: {
    notify: {
      runTmux,
      maybeAcceptClaudeTrustPrompt,
      sendAndSubmitTmuxPaneMessage,
      submitTmuxPaneInput
    },
    paneBinding: {
      runTmux,
      buildAgentCommand,
      respawnTmuxPaneCommand
    }
  },
  writeStateSnapshot
} as const satisfies MetaReviewGateDependencyDefaults;
