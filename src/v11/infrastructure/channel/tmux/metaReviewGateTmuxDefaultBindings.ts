import {
  respawnTmuxPaneCommand
} from "./tmuxManager.js";
import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "./tmuxInput.js";

export const acceptMetaReviewTrustPrompt = maybeAcceptClaudeTrustPrompt;
export const sendMetaReviewSubmissionRequest = sendAndSubmitTmuxPaneMessage;
export const submitMetaReviewInput = submitTmuxPaneInput;
export const respawnMetaReviewPane = respawnTmuxPaneCommand;
