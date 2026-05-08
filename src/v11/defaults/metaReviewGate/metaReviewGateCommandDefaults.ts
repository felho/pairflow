import { readFile } from "node:fs/promises";

import { buildAgentCommand } from "../../shared/command/agentCommand.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { setMetaReviewerPaneBinding } from "../../infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import { runTmux } from "../../infrastructure/channel/tmux/tmuxManager.js";
import {
  acceptMetaReviewTrustPrompt,
  respawnMetaReviewPane,
  sendMetaReviewSubmissionRequest,
  submitMetaReviewInput
} from "../../infrastructure/channel/tmux/metaReviewGateTmuxDefaultBindings.js";
import type {
  MetaReviewGateDependencyDefaults
} from "../../application/metaReviewGate/metaReviewGateCommandDefaults.js";

export type { MetaReviewGateDependencyDefaults };

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
