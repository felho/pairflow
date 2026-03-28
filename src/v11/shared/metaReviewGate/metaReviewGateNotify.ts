import {
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "../../../core/runtime/tmuxInput.js";
import { runTmux } from "../../../core/runtime/tmuxManager.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../../core/runtime/metaReviewSubmitGuidance.js";
import type {
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput
} from "./metaReviewGateTypes.js";

const metaReviewerPaneExitedReasonCode = "META_REVIEWER_PANE_EXITED";
const metaReviewRequestDeliveryUnconfirmedReasonCode =
  "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED";

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function isAgentPromptLine(line: string): boolean {
  return /^\s*(?:[|│┃]\s*)*[>❯]/u.test(line);
}

function findLastIndex(arr: string[], predicate: (item: string) => boolean): number {
  for (let index = arr.length - 1; index >= 0; index -= 1) {
    if (predicate(arr[index]!)) {
      return index;
    }
  }
  return -1;
}

function paneShowsExitedCodexShell(text: string): boolean {
  return /codex exited \(code \d+\)\. Dropping to interactive shell\./u.test(text);
}

type MarkerStatus = "submitted" | "stuck_in_input" | "not_found";

function detectSubmittedMarker(text: string, marker: string): MarkerStatus {
  if (!text.includes(marker)) {
    return "not_found";
  }

  const lines = text.split("\n");
  const lastPromptIndex = findLastIndex(lines, isAgentPromptLine);
  if (lastPromptIndex < 0) {
    return "submitted";
  }

  const beforePrompt = lines.slice(0, lastPromptIndex).join("\n");
  if (beforePrompt.includes(marker)) {
    return "submitted";
  }

  return "stuck_in_input";
}

function createMetaReviewNotifyError(input: {
  reasonCode: string;
  message: string;
  context: Record<string, unknown>;
}): Error {
  return new Error(
    `${input.reasonCode}: ${input.message} ${JSON.stringify(input.context)}`
  );
}

async function assertMetaReviewRequestSubmitted(input: {
  runTmux: typeof runTmux;
  targetPane: string;
  marker: string;
}): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(800);
    const capture = await input.runTmux(["capture-pane", "-pt", input.targetPane], {
      allowFailure: true
    });
    if (capture.exitCode === 0) {
      if (paneShowsExitedCodexShell(capture.stdout)) {
        throw createMetaReviewNotifyError({
          reasonCode: metaReviewerPaneExitedReasonCode,
          message: "meta-reviewer pane fell back to interactive shell after Codex exit.",
          context: {
            target_pane: input.targetPane,
            request_marker: input.marker
          }
        });
      }

      const markerStatus = detectSubmittedMarker(capture.stdout, input.marker);
      if (markerStatus === "submitted") {
        return;
      }
    }

    if (attempt < 2) {
      await sleep(900);
      await submitTmuxPaneInput(input.runTmux, input.targetPane);
    }
  }

  throw createMetaReviewNotifyError({
    reasonCode: metaReviewRequestDeliveryUnconfirmedReasonCode,
    message: "meta-reviewer pane did not confirm structured submit request delivery.",
    context: {
      target_pane: input.targetPane,
      request_marker: input.marker,
      attempt_limit: 3
    }
  });
}

export async function notifyMetaReviewerSubmissionRequest(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<void> {
  const runner = dependencies.runTmux ?? runTmux;
  const requestMarker = `bubble=${input.bubbleId} meta-review request round=${input.round}.`;
  const message = [
    `# [pairflow] ${requestMarker}`,
    "Perform autonomous meta-review now, then submit through structured Pairflow CLI (no pane markers).",
    `Required command (include --report-json parity fields): ${buildMetaReviewSubmitCommandTemplate({ bubbleId: input.bubbleId, round: input.round })}. ${buildMetaReviewSubmitApproveParityNote()}`
  ].join(" ");

  await maybeAcceptClaudeTrustPrompt(runner, input.targetPane).catch(() => undefined);
  await sendAndSubmitTmuxPaneMessage(runner, input.targetPane, message);
  await assertMetaReviewRequestSubmitted({
    runTmux: runner,
    targetPane: input.targetPane,
    marker: requestMarker
  });
}
