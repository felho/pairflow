import { buildAgentCommand } from "./agentCommand.js";
import { buildMetaReviewerStartupPrompt } from "../../v11/application/start/startCommandPrompts.js";
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
