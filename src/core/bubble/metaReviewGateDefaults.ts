import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../protocol/transcriptStore.js";
import { setMetaReviewerPaneBinding } from "../../v11/infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import { readFile, writeFile } from "node:fs/promises";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStore.js";
import { runTmux } from "../runtime/tmuxManager.js";
import { buildAgentCommand } from "../../v11/shared/command/agentCommand.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "../../v11/infrastructure/channel/tmux/tmuxInput.js";
import { respawnTmuxPaneCommand } from "../runtime/tmuxManager.js";

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
  writeFile,
  writeStateSnapshot
} as const;
