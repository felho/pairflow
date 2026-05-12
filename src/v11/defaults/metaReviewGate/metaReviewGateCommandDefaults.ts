import { readFile } from "node:fs/promises";

import { buildAgentCommand } from "../../shared/command/agentCommand.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../infrastructure/artifact/transcript/transcriptStore.js";
import {
  readStateSnapshot as readStateSnapshotPersisted,
  writeStateSnapshot as writeStateSnapshotPersisted
} from "../../infrastructure/state/stateStore.js";
import {
  adaptPersistedReadPortToDomain,
  adaptPersistedWritePortToDomain
} from "../../shared/mutation/mutationBoundaryIO.js";
import { setMetaReviewerPaneBinding } from "../../infrastructure/channel/tmux/metaReviewerPaneBinding.js";

// Adapt persisted-shape infrastructure ports into domain-variant ports
// at the defaults boundary so the metaReviewGate lane holds
// BubbleStateSnapshot at its public dependency contract.
const readStateSnapshot = adaptPersistedReadPortToDomain(readStateSnapshotPersisted);
const writeStateSnapshot = adaptPersistedWritePortToDomain(writeStateSnapshotPersisted);
import { runTmux } from "../../infrastructure/channel/tmux/tmuxManager.js";
import {
  acceptMetaReviewTrustPrompt,
  respawnMetaReviewPane,
  sendMetaReviewSubmissionRequest,
  submitMetaReviewInput
} from "../../infrastructure/channel/tmux/metaReviewGateTmuxDefaultBindings.js";
import type {
  ApplyMetaReviewGateOnConvergenceDependencies,
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities
} from "../../shared/metaReviewGate/index.js";

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
      tmux: {
        runner:
          NonNullable<
            NonNullable<MetaReviewGateNotifyRuntimeCapabilities["tmux"]>["runner"]
          >;
        maybeAcceptTrustPrompt:
          NonNullable<
            NonNullable<
              MetaReviewGateNotifyRuntimeCapabilities["tmux"]
            >["maybeAcceptTrustPrompt"]
          >;
        sendSubmissionRequestMessage:
          NonNullable<
            NonNullable<
              MetaReviewGateNotifyRuntimeCapabilities["tmux"]
            >["sendSubmissionRequestMessage"]
          >;
        submitPaneInput:
          NonNullable<
            NonNullable<
              MetaReviewGateNotifyRuntimeCapabilities["tmux"]
            >["submitPaneInput"]
          >;
      };
    };
    paneBinding: {
      buildAgentCommand:
        NonNullable<MetaReviewGatePaneBindingRuntimeCapabilities["buildAgentCommand"]>;
      tmux: {
        runner:
          NonNullable<
            NonNullable<
              MetaReviewGatePaneBindingRuntimeCapabilities["tmux"]
            >["runner"]
          >;
        respawnPaneCommand:
          NonNullable<
            NonNullable<
              MetaReviewGatePaneBindingRuntimeCapabilities["tmux"]
            >["respawnPaneCommand"]
          >;
      };
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
      tmux: {
        runner: runTmux,
        maybeAcceptTrustPrompt: acceptMetaReviewTrustPrompt,
        sendSubmissionRequestMessage: sendMetaReviewSubmissionRequest,
        submitPaneInput: submitMetaReviewInput
      }
    },
    paneBinding: {
      buildAgentCommand,
      tmux: {
        runner: runTmux,
        respawnPaneCommand: respawnMetaReviewPane
      }
    }
  },
  writeStateSnapshot
} as const satisfies MetaReviewGateDependencyDefaults;
