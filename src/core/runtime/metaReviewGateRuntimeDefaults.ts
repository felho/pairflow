import { buildAgentCommand } from "./agentCommand.js";
import { buildMetaReviewerStartupPrompt } from "./metaReviewerStartupPrompt.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "./tmuxInput.js";
import { respawnTmuxPaneCommand, runTmux } from "./tmuxManager.js";

export const metaReviewGateRuntimeDefaults = {
  buildAgentCommand,
  buildMetaReviewerStartupPrompt,
  maybeAcceptClaudeTrustPrompt,
  respawnTmuxPaneCommand,
  runTmux,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} as const;
