import { buildAgentCommand } from "../../v11/shared/command/agentCommand.js";
import { buildMetaReviewerStartupPrompt } from "../../v11/application/start/startCommandPrompts.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "../../v11/infrastructure/channel/tmux/tmuxInput.js";
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
