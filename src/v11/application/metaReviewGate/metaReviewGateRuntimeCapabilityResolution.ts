import type {
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGateNotifyTmuxCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities,
  MetaReviewGatePaneBindingTmuxCapabilities
} from "../../shared/metaReviewGate/metaReviewGateRuntimeCapabilities.js";

function hasDefinedValues(record: Record<string, unknown>): boolean {
  return Object.values(record).some((value) => value !== undefined);
}

export function resolveMetaReviewGateNotifyTmuxCapabilities(
  runtime: MetaReviewGateNotifyRuntimeCapabilities | undefined
): MetaReviewGateNotifyTmuxCapabilities | undefined {
  const runner = runtime?.tmux?.runner;
  const maybeAcceptTrustPrompt = runtime?.tmux?.maybeAcceptTrustPrompt;
  const sendSubmissionRequestMessage = runtime?.tmux?.sendSubmissionRequestMessage;
  const submitPaneInput = runtime?.tmux?.submitPaneInput;
  const resolved = {
    ...(runner !== undefined ? { runner } : {}),
    ...(maybeAcceptTrustPrompt !== undefined
      ? { maybeAcceptTrustPrompt }
      : {}),
    ...(sendSubmissionRequestMessage !== undefined
      ? { sendSubmissionRequestMessage }
      : {}),
    ...(submitPaneInput !== undefined ? { submitPaneInput } : {})
  };

  return hasDefinedValues(resolved) ? resolved : undefined;
}

export function resolveMetaReviewGatePaneBindingTmuxCapabilities(
  runtime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined
): MetaReviewGatePaneBindingTmuxCapabilities | undefined {
  const runner = runtime?.tmux?.runner;
  const respawnPaneCommand = runtime?.tmux?.respawnPaneCommand;
  const resolved = {
    ...(runner !== undefined ? { runner } : {}),
    ...(respawnPaneCommand !== undefined ? { respawnPaneCommand } : {})
  };

  return hasDefinedValues(resolved) ? resolved : undefined;
}
