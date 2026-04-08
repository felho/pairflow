import {
  confirmTmuxPaneMarkerSubmission,
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "./tmuxInput.js";
import type { TmuxRunner } from "../../../shared/ports/tmuxSessions.js";

export interface SeedBubbleTmuxPaneMessagesInput {
  runner: TmuxRunner;
  implementerPaneId: string;
  reviewerPaneId: string;
  metaReviewerPaneId: string;
  implementerSubmitStartupPrompt?: boolean | undefined;
  reviewerSubmitStartupPrompt?: boolean | undefined;
  metaReviewerSubmitStartupPrompt?: boolean | undefined;
  implementerBootstrapMessage?: string | undefined;
  reviewerBootstrapMessage?: string | undefined;
  metaReviewerBootstrapMessage?: string | undefined;
  implementerKickoffMessage?: string | undefined;
  reviewerKickoffMessage?: string | undefined;
  metaReviewerKickoffMessage?: string | undefined;
}

function resolvePairflowPaneMessageMarker(message: string): string | undefined {
  const match = /\[pairflow\]\s+bubble=\S+/u.exec(message);
  return match?.[0];
}

async function submitStartupPrompt(
  runner: TmuxRunner,
  targetPane: string,
  shouldSubmit: boolean | undefined
): Promise<void> {
  if (!shouldSubmit) {
    return;
  }

  await new Promise<void>((resolvePromise) => {
    setTimeout(resolvePromise, 1500);
  });
  await submitTmuxPaneInput(runner, targetPane);
}

async function sendPaneMessage(
  runner: TmuxRunner,
  targetPane: string,
  message: string | undefined
): Promise<void> {
  if ((message?.trim().length ?? 0) === 0) {
    return;
  }

  await maybeAcceptClaudeTrustPrompt(runner, targetPane).catch(() => undefined);
  const concreteMessage = message as string;
  await sendAndSubmitTmuxPaneMessage(runner, targetPane, concreteMessage);
  const marker = resolvePairflowPaneMessageMarker(concreteMessage);
  if (marker !== undefined) {
    await confirmTmuxPaneMarkerSubmission({
      runner,
      targetPane,
      marker
    });
  }
}

export async function seedBubbleTmuxPaneMessages(
  input: SeedBubbleTmuxPaneMessagesInput
): Promise<void> {
  await submitStartupPrompt(
    input.runner,
    input.implementerPaneId,
    input.implementerSubmitStartupPrompt
  );
  await submitStartupPrompt(
    input.runner,
    input.reviewerPaneId,
    input.reviewerSubmitStartupPrompt
  );
  await submitStartupPrompt(
    input.runner,
    input.metaReviewerPaneId,
    input.metaReviewerSubmitStartupPrompt
  );
  await sendPaneMessage(input.runner, input.implementerPaneId, input.implementerBootstrapMessage);
  await sendPaneMessage(input.runner, input.reviewerPaneId, input.reviewerBootstrapMessage);
  await sendPaneMessage(input.runner, input.metaReviewerPaneId, input.metaReviewerBootstrapMessage);
  await sendPaneMessage(input.runner, input.implementerPaneId, input.implementerKickoffMessage);
  await sendPaneMessage(input.runner, input.reviewerPaneId, input.reviewerKickoffMessage);
  await sendPaneMessage(input.runner, input.metaReviewerPaneId, input.metaReviewerKickoffMessage);
}
