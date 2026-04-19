import { afterEach, describe, expect, it, vi } from "vitest";

import {
  notifyMetaReviewerSubmissionRequest
} from "../../../../src/v11/application/metaReviewGate/metaReviewGateNotify.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("metaReviewGateNotify", () => {
  it.each([
    {
      label: "runTmux is missing",
      runtime: {
        sendAndSubmitTmuxPaneMessage: vi.fn(async () => undefined),
        submitTmuxPaneInput: vi.fn(async () => undefined)
      }
    },
    {
      label: "sendAndSubmitTmuxPaneMessage is missing",
      runtime: {
        runTmux: vi.fn(),
        submitTmuxPaneInput: vi.fn(async () => undefined)
      }
    },
    {
      label: "submitTmuxPaneInput is missing",
      runtime: {
        runTmux: vi.fn(),
        sendAndSubmitTmuxPaneMessage: vi.fn(async () => undefined)
      }
    }
  ])("fails closed when notify runtime capabilities are incomplete: $label", async ({ runtime }) => {
    const result = await notifyMetaReviewerSubmissionRequest({
      bubbleId: "b_meta_review_notify_runtime_missing",
      round: 2,
      targetPane: "pf-b_meta_review_notify_runtime_missing:0.3"
    }, {
      runtime
    });

    expect(result).toEqual({
      status: "failed",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
      message: "meta-review gate notify runtime capabilities are unavailable."
    });
  });

  it("does not require trust-prompt helper to confirm delivery", async () => {
    vi.useFakeTimers();

    const bubbleId = "b_meta_review_notify_optional_trust_prompt";
    const round = 3;
    const targetPane = "pf-b_meta_review_notify_optional_trust_prompt:0.3";
    const marker = `bubble=${bubbleId} meta-review request round=${round}.`;
    const runTmux = vi.fn(async () => ({
      stdout: `${marker}\n>`,
      stderr: "",
      exitCode: 0
    }));
    const sendAndSubmitTmuxPaneMessage = vi.fn(async () => undefined);
    const submitTmuxPaneInput = vi.fn(async () => undefined);

    const resultPromise = notifyMetaReviewerSubmissionRequest({
      bubbleId,
      round,
      targetPane
    }, {
      runtime: {
        runTmux,
        sendAndSubmitTmuxPaneMessage,
        submitTmuxPaneInput
      }
    });

    await vi.advanceTimersByTimeAsync(800);

    await expect(resultPromise).resolves.toEqual({
      status: "confirmed",
      reasonCode: null,
      message: "meta-review submit request delivery confirmed from pane scrollback."
    });
    expect(sendAndSubmitTmuxPaneMessage).toHaveBeenCalledTimes(1);
    expect(submitTmuxPaneInput).not.toHaveBeenCalled();
  });

  it("returns uncertain when pane scrollback never confirms the submitted marker", async () => {
    vi.useFakeTimers();

    const bubbleId = "b_meta_review_notify_uncertain";
    const round = 4;
    const targetPane = "pf-b_meta_review_notify_uncertain:0.3";
    const runTmux = vi.fn(async () => ({
      stdout: "still waiting for structured submit to appear",
      stderr: "",
      exitCode: 0
    }));
    const sendAndSubmitTmuxPaneMessage = vi.fn(async () => undefined);
    const submitTmuxPaneInput = vi.fn(async () => undefined);

    const resultPromise = notifyMetaReviewerSubmissionRequest({
      bubbleId,
      round,
      targetPane
    }, {
      runtime: {
        runTmux,
        sendAndSubmitTmuxPaneMessage,
        submitTmuxPaneInput
      }
    });

    await vi.advanceTimersByTimeAsync(5000);

    await expect(resultPromise).resolves.toEqual({
      status: "uncertain",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "meta-reviewer pane did not confirm structured submit request delivery."
    });
    expect(sendAndSubmitTmuxPaneMessage).toHaveBeenCalledTimes(1);
    expect(submitTmuxPaneInput).toHaveBeenCalledTimes(2);
  });

  it("retries enter when the submitted marker is stuck in pane input before confirmation", async () => {
    vi.useFakeTimers();

    const bubbleId = "b_meta_review_notify_stuck_in_input";
    const round = 4;
    const targetPane = "pf-b_meta_review_notify_stuck_in_input:0.3";
    const marker = `bubble=${bubbleId} meta-review request round=${round}.`;
    const runTmux = vi.fn()
      .mockResolvedValueOnce({
        stdout: `>\n${marker}`,
        stderr: "",
        exitCode: 0
      })
      .mockResolvedValueOnce({
        stdout: `${marker}\n>`,
        stderr: "",
        exitCode: 0
      });
    const sendAndSubmitTmuxPaneMessage = vi.fn(async () => undefined);
    const submitTmuxPaneInput = vi.fn(async () => undefined);

    const resultPromise = notifyMetaReviewerSubmissionRequest({
      bubbleId,
      round,
      targetPane
    }, {
      runtime: {
        runTmux,
        sendAndSubmitTmuxPaneMessage,
        submitTmuxPaneInput
      }
    });

    await vi.advanceTimersByTimeAsync(2600);

    await expect(resultPromise).resolves.toEqual({
      status: "confirmed",
      reasonCode: null,
      message: "meta-review submit request delivery confirmed from pane scrollback."
    });
    expect(sendAndSubmitTmuxPaneMessage).toHaveBeenCalledTimes(1);
    expect(submitTmuxPaneInput).toHaveBeenCalledTimes(1);
    expect(runTmux).toHaveBeenCalledTimes(2);
  });

  it("returns failed when pane scrollback shows Codex exited before confirmation", async () => {
    vi.useFakeTimers();

    const bubbleId = "b_meta_review_notify_pane_exited";
    const round = 5;
    const targetPane = "pf-b_meta_review_notify_pane_exited:0.3";
    const runTmux = vi.fn(async () => ({
      stdout: "codex exited (code 1). Dropping to interactive shell.",
      stderr: "",
      exitCode: 0
    }));
    const sendAndSubmitTmuxPaneMessage = vi.fn(async () => undefined);
    const submitTmuxPaneInput = vi.fn(async () => undefined);

    const resultPromise = notifyMetaReviewerSubmissionRequest({
      bubbleId,
      round,
      targetPane
    }, {
      runtime: {
        runTmux,
        sendAndSubmitTmuxPaneMessage,
        submitTmuxPaneInput
      }
    });

    await vi.advanceTimersByTimeAsync(800);

    await expect(resultPromise).resolves.toEqual({
      status: "failed",
      reasonCode: "META_REVIEWER_PANE_EXITED",
      message: "meta-reviewer pane fell back to interactive shell after Codex exit."
    });
    expect(sendAndSubmitTmuxPaneMessage).toHaveBeenCalledTimes(1);
    expect(submitTmuxPaneInput).not.toHaveBeenCalled();
  });
});
