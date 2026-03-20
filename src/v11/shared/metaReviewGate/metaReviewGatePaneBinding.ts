import type { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import type { runTmux } from "../../../core/runtime/tmuxManager.js";
import type { NotifyMetaReviewerSubmissionRequest } from "./metaReviewGateTypes.js";

export async function resolveMetaReviewerPaneWarning(input: {
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  runTmuxRunner: typeof runTmux;
  sessionsPath: string;
  bubbleId: string;
  round: number;
  now: Date;
}): Promise<{ warning: string | null; shouldDeactivate: boolean }> {
  let warning: string | null = null;
  let shouldDeactivate = false;
  const bindStart = await input.setMetaReviewerPane({
    sessionsPath: input.sessionsPath,
    bubbleId: input.bubbleId,
    active: true,
    now: input.now
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      updated: false,
      reason: "no_runtime_session" as const,
      errorMessage: reason
    };
  });
  if (!bindStart.updated) {
    const bindReason = "errorMessage" in bindStart
      ? bindStart.errorMessage
      : bindStart.reason ?? "unknown";
    return {
      warning: `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`,
      shouldDeactivate: false
    };
  }
  if (!("record" in bindStart) || bindStart.record === undefined) {
    return { warning: null, shouldDeactivate: false };
  }

  shouldDeactivate = true;
  const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
  const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
  await input.notifySubmissionRequest(
    {
      bubbleId: input.bubbleId,
      round: input.round,
      targetPane
    },
    {
      runTmux: input.runTmuxRunner
    }
  ).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    warning = `META_REVIEWER_PANE_UNAVAILABLE: ${reason}`;
  });
  return { warning, shouldDeactivate };
}
