import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../shared/metaReview/metaReviewSubmitGuidance.js";
import type {
  MetaReviewRuntimeDeliveryObservation,
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";
import {
  resolveMetaReviewGateNotifyTmuxCapabilities
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function paneShowsExitedAgentShell(input: {
  text: string;
  metaReviewerAgent: string;
}): boolean {
  const pattern = new RegExp(
    `${escapeRegex(input.metaReviewerAgent)} exited \\(code \\d+\\)\\. Dropping to interactive shell\\.`,
    "u"
  );
  return pattern.test(input.text);
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

async function assertMetaReviewRequestSubmitted(input: {
  paneRunner: NonNullable<
    NonNullable<
      NonNullable<
        NotifyMetaReviewerSubmissionRequestDependencies["runtime"]
      >["tmux"]
    >["runner"]
  >;
  submitPaneInput: NonNullable<
    NonNullable<
      NonNullable<
        NotifyMetaReviewerSubmissionRequestDependencies["runtime"]
      >["tmux"]
    >["submitPaneInput"]
  >;
  targetPane: string;
  marker: string;
  metaReviewerAgent: string;
}): Promise<MetaReviewRuntimeDeliveryObservation> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(800);
    const capture = await input.paneRunner(
      ["capture-pane", "-p", "-t", input.targetPane, "-S", "-"],
      {
        allowFailure: true
      }
    );
    if (capture.exitCode === 0) {
      if (paneShowsExitedAgentShell({
        text: capture.stdout,
        metaReviewerAgent: input.metaReviewerAgent
      })) {
        return {
          status: "failed",
          reasonCode: metaReviewerPaneExitedReasonCode,
          message:
            `meta-reviewer pane fell back to interactive shell after ${input.metaReviewerAgent} exit.`
        };
      }

      const markerStatus = detectSubmittedMarker(capture.stdout, input.marker);
      if (markerStatus === "submitted") {
        return {
          status: "confirmed",
          reasonCode: null,
          message:
            "meta-review submit request delivery confirmed from pane scrollback."
        };
      }
    }

    if (attempt < 2) {
      await sleep(900);
      await input.submitPaneInput(input.paneRunner, input.targetPane);
    }
  }

  return {
    status: "uncertain",
    reasonCode: metaReviewRequestDeliveryUnconfirmedReasonCode,
    message: "meta-reviewer pane did not confirm structured submit request delivery."
  };
}

export async function notifyMetaReviewerSubmissionRequest(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<MetaReviewRuntimeDeliveryObservation> {
  const runtime = dependencies.runtime;
  const tmux = resolveMetaReviewGateNotifyTmuxCapabilities(runtime);
  const runner = tmux?.runner;
  const maybeAcceptTrustPrompt = tmux?.maybeAcceptTrustPrompt;
  const sendSubmissionRequestMessage = tmux?.sendSubmissionRequestMessage;
  const submitPaneInput = tmux?.submitPaneInput;
  if (
    runner === undefined ||
    sendSubmissionRequestMessage === undefined ||
    submitPaneInput === undefined
  ) {
    return {
      status: "failed",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
      message: "meta-review gate notify runtime capabilities are unavailable."
    };
  }
  const requestMarker = `bubble=${input.bubbleId} meta-review request round=${input.round}.`;
  const message = [
    `# [pairflow] ${requestMarker}`,
    "Perform autonomous meta-review now, then submit through structured Pairflow CLI (no pane markers).",
    `Required command (include --report-json parity fields): ${buildMetaReviewSubmitCommandTemplate({ bubbleId: input.bubbleId, round: input.round })}. ${buildMetaReviewSubmitApproveParityNote()}`
  ].join(" ");

  if (maybeAcceptTrustPrompt !== undefined) {
    await maybeAcceptTrustPrompt(runner, input.targetPane).catch(
      () => undefined
    );
  }
  try {
    await sendSubmissionRequestMessage(runner, input.targetPane, message);
  } catch (error) {
    return {
      status: "failed",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
      message: error instanceof Error ? error.message : String(error)
    };
  }
  return assertMetaReviewRequestSubmitted({
    paneRunner: runner,
    submitPaneInput,
    targetPane: input.targetPane,
    marker: requestMarker,
    metaReviewerAgent: input.metaReviewerAgent
  });
}
