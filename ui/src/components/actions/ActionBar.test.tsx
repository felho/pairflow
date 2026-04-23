import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActionBar } from "./ActionBar";
import { bubbleCard } from "../../test/fixtures";
import type { BubbleActionKind, BubbleLifecycleState } from "../../lib/types";

const actionLabels: Partial<Record<Exclude<BubbleActionKind, "delete">, string>> = {
  start: "Start",
  approve: "Approve",
  "request-rework": "Request Rework",
  reply: "Reply",
  resume: "Resume",
  restart: "Restart",
  commit: "Commit",
  merge: "Merge",
  open: "Open",
  attach: "Attach",
  stop: "Stop"
};

const allActions: Array<Exclude<BubbleActionKind, "delete">> = [
  "start",
  "approve",
  "request-rework",
  "reply",
  "resume",
  "update-review-policy",
  "restart",
  "commit",
  "merge",
  "open",
  "attach",
  "stop"
];

function resolveActionLabelForState(
  state: BubbleLifecycleState,
  action: Exclude<BubbleActionKind, "delete">
): string {
  if (state === "WAITING_HUMAN" && action === "request-rework") {
    return "Queue Rework";
  }
  return actionLabels[action] ?? action;
}

const expectedMatrix: Record<BubbleLifecycleState, BubbleActionKind[]> = {
  CREATED: ["start", "update-review-policy", "stop"],
  PREPARING_WORKSPACE: ["update-review-policy", "stop"],
  RUNNING: ["update-review-policy", "restart", "open", "stop"],
  WAITING_HUMAN: [
    "request-rework",
    "reply",
    "resume",
    "update-review-policy",
    "restart",
    "open",
    "stop"
  ],
  READY_FOR_HUMAN_APPROVAL: [
    "approve",
    "request-rework",
    "update-review-policy",
    "restart",
    "open",
    "stop"
  ],
  APPROVED_FOR_COMMIT: ["commit", "restart", "open", "stop"],
  COMMITTED: ["restart", "open", "stop"],
  DONE: ["merge", "open"],
  FAILED: ["open"],
  CANCELLED: ["open"]
};

describe("ActionBar", () => {
  it("renders only matrix-allowed actions for each lifecycle state", () => {
    for (const [state, expectedActions] of Object.entries(expectedMatrix) as Array<
      [BubbleLifecycleState, BubbleActionKind[]]
    >) {
      const onAction = vi.fn(() => Promise.resolve(undefined));
      const { unmount } = render(
        <ActionBar
          bubble={bubbleCard({ bubbleId: `b-${state.toLowerCase()}`, repoPath: "/repo-a", state })}
          attach={{
            visible: false,
            enabled: false,
            command: `tmux attach -t pf-b-${state.toLowerCase()}`,
            hint: null
          }}
          isSubmitting={false}
          actionError={null}
          retryHint={null}
          actionFailure={null}
          onAction={onAction}

          onClearFeedback={vi.fn()}
        />
      );

      for (const action of allActions) {
        if (action === "update-review-policy") {
          const policyToggle = screen.queryByRole("switch", {
            name: "Meta review only"
          });
          if (expectedActions.includes(action)) {
            expect(policyToggle).toBeInTheDocument();
          } else {
            expect(policyToggle).not.toBeInTheDocument();
          }
          continue;
        }
        const button = screen.queryByRole("button", {
          name: resolveActionLabelForState(state, action)
        });
        if (expectedActions.includes(action)) {
          expect(button).toBeInTheDocument();
        } else {
          expect(button).not.toBeInTheDocument();
        }
      }

      unmount();
    }
  });

  it("requires message for request-rework modal", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-ready",
          repoPath: "/repo-a",
          state: "READY_FOR_HUMAN_APPROVAL"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-ready",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}

        onClearFeedback={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Request Rework" }));
    await user.click(screen.getByRole("button", { name: "Send Rework" }));

    expect(screen.getByText("Message is required.")).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Message"), "Please update tests");
    await user.click(screen.getByRole("button", { name: "Send Rework" }));

    expect(onAction).toHaveBeenCalledWith({
      bubbleId: "b-ready",
      action: "request-rework",
      message: "Please update tests"
    });
  });

  it("explains that waiting-human rework is queued and distinct from reply", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-waiting",
          repoPath: "/repo-a",
          state: "WAITING_HUMAN"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-waiting",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}
        onClearFeedback={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Queue Rework" }));
    expect(
      screen.getByText(
        "Rework message is required. This queues deterministic rework for orchestrator consumption; plain reply does not guarantee rework."
      )
    ).toBeInTheDocument();
    const queueButtons = screen.getAllByRole("button", { name: "Queue Rework" });
    await user.click(queueButtons[1]!);

    expect(screen.getByText("Message is required.")).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("keeps reply and resume actions available for waiting-human meta-review timeout bubbles", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-meta-timeout",
          repoPath: "/repo-a",
          state: "WAITING_HUMAN",
          activeAgent: null,
          activeRole: null,
          metaReview: {
            authorityActive: false,
            runtimeDelivery: {
              status: "failed",
              reasonCode: "META_REVIEWER_PANE_EXITED",
              message: "meta-review runtime failed before submit completed",
              observedAt: "2026-02-24T12:30:00.000Z",
              observedForHandoffId: "meta_review:b-meta-timeout:round:3:attempt:1",
              observedForRound: 3
            }
          }
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-meta-timeout",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Reply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Queue Rework" })).toBeInTheDocument();
  });

  it("submits commit form with default auto=true", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-commit",
          repoPath: "/repo-a",
          state: "APPROVED_FOR_COMMIT"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-commit",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}

        onClearFeedback={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Commit" }));
    await user.click(screen.getByRole("button", { name: "Submit Commit" }));

    expect(onAction).toHaveBeenCalledWith({
      bubbleId: "b-commit",
      action: "commit",
      auto: true
    });
  });

  it("calls onAction with attach action when Attach button clicked", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-run",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: true,
          enabled: true,
          command: "tmux attach -t pf-b-run",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}
        onClearFeedback={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Attach" }));

    expect(onAction).toHaveBeenCalledWith({
      bubbleId: "b-run",
      action: "attach"
    });
    expect(screen.queryByText("Opening Warp terminal...")).not.toBeInTheDocument();
  });

  it("renders attach as icon-only control with accessible name", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-run-attach",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: true,
          enabled: true,
          command: "tmux attach -t pf-b-run-attach",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    const attachButton = screen.getByRole("button", { name: "Attach" });
    expect(attachButton).toBeInTheDocument();
    expect(attachButton).toHaveTextContent("");
    expect(attachButton.querySelector("svg")).not.toBeNull();
  });

  it("orders running trailing controls as stop, restart, attach, open, then policy controls", () => {
    const { container } = render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-run-order",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: true,
          enabled: true,
          command: "tmux attach -t pf-b-run-order",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
        expectedBubbleToml={"id = \"b-run-order\""}
      />
    );

    const controls = Array.from(
      container.querySelectorAll("button, [role='switch'], select")
    ).map((element) => element.getAttribute("aria-label") ?? element.textContent ?? "");

    expect(controls).toEqual([
      "Stop",
      "Restart",
      "Attach",
      "Open",
      "Meta review only",
      "Meta auto-rework severity"
    ]);
  });

  it("toggles review policy action toward meta-only when the bubble is currently full", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-policy",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-policy",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}
        onClearFeedback={vi.fn()}
        expectedBubbleToml={"id = \"b-policy\""}
      />
    );

    const toggle = screen.getByRole("switch", { name: "Meta review only" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);

    expect(onAction).toHaveBeenCalledWith({
      bubbleId: "b-policy",
      action: "update-review-policy",
      reviewLoopMode: "meta_only",
      metaReviewAutoReworkMinSeverity: "P1",
      expectedBubbleToml: "id = \"b-policy\""
    });
  });

  it("forwards expectedBubbleToml unchanged when the canonical detail ends with newlines", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));
    const expectedBubbleToml = "id = \"b-policy\"\nreview_loop_mode = \"full\"\n";

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-policy",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-policy",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}
        onClearFeedback={vi.fn()}
        expectedBubbleToml={expectedBubbleToml}
      />
    );

    await user.click(screen.getByRole("switch", { name: "Meta review only" }));

    expect(onAction).toHaveBeenCalledWith({
      bubbleId: "b-policy",
      action: "update-review-policy",
      reviewLoopMode: "meta_only",
      metaReviewAutoReworkMinSeverity: "P1",
      expectedBubbleToml
    });
  });

  it("updates meta auto-rework severity from the compact dropdown", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(() => Promise.resolve(undefined));

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-policy-severity",
          repoPath: "/repo-a",
          state: "RUNNING",
          reviewPolicy: {
            requested_loop_mode: "meta_only",
            effective_loop_mode: "full",
            support_status: "guarded",
            meta_review_auto_rework_min_severity: "P1"
          }
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-policy-severity",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={onAction}
        onClearFeedback={vi.fn()}
        expectedBubbleToml={"id = \"b-policy-severity\""}
      />
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Meta auto-rework severity" }),
      "P3"
    );

    expect(onAction).toHaveBeenCalledWith({
      bubbleId: "b-policy-severity",
      action: "update-review-policy",
      reviewLoopMode: "meta_only",
      metaReviewAutoReworkMinSeverity: "P3",
      expectedBubbleToml: "id = \"b-policy-severity\""
    });
  });

  it("disables review policy action until the latest bubble detail revision is loaded", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-policy-missing-detail",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-policy-missing-detail",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
        expectedBubbleToml={null}
      />
    );

    expect(screen.getByRole("switch", { name: "Meta review only" })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Meta auto-rework severity" })
    ).toBeDisabled();
  });

  it("keeps review policy control visible but disabled when policy data is missing", () => {
    render(
      <ActionBar
        bubble={{
          ...bubbleCard({
            bubbleId: "b-policy-unavailable",
            repoPath: "/repo-a",
            state: "RUNNING"
          }),
          reviewPolicy: null
        }}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-policy-unavailable",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
        expectedBubbleToml={null}
      />
    );

    const toggle = screen.getByRole("switch", { name: "Meta review only" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders disabled attach with its hint when availability is fail-closed", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-remote-unavailable",
          repoPath: "/repo-a",
          state: "WAITING_HUMAN"
        })}
        attach={{
          visible: true,
          enabled: false,
          command: "pairflow bubble attach --id b-remote-unavailable",
          hint: "Remote runtime is unavailable. Attach stays fail-closed and will not restart it automatically."
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Attach" })).toBeDisabled();
    expect(screen.getByText(/fail-closed/u)).toBeInTheDocument();
  });

  it("renders created remote attach hint without distorting the start-first message", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-remote-created",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: true,
          enabled: false,
          command: "pairflow bubble attach --id b-remote-created",
          hint: "Remote bubble is not started yet. Start it first, then attach."
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Attach" })).toBeDisabled();
    expect(
      screen.getByText("Remote bubble is not started yet. Start it first, then attach.")
    ).toBeInTheDocument();
  });

  it("renders restart as icon-only control with accessible name", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-run",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-run",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    const restartButton = screen.getByRole("button", { name: "Restart" });
    expect(restartButton).toBeInTheDocument();
    expect(restartButton).toHaveTextContent("");
    expect(restartButton.querySelector("svg")).not.toBeNull();
  });

  it("renders open as icon-only control with accessible name", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-done",
          repoPath: "/repo-a",
          state: "DONE"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-done",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    const openButton = screen.getByRole("button", { name: "Open" });
    expect(openButton).toBeInTheDocument();
    expect(openButton).toHaveTextContent("");
    expect(openButton.querySelector("svg")).not.toBeNull();
  });

  it("renders stop as icon-only control with accessible name", () => {
    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-run-stop",
          repoPath: "/repo-a",
          state: "RUNNING"
        })}
        attach={{
          visible: false,
          enabled: false,
          command: "tmux attach -t pf-b-run-stop",
          hint: null
        }}
        isSubmitting={false}
        actionError={null}
        retryHint={null}
        actionFailure={null}
        onAction={vi.fn(() => Promise.resolve(undefined))}
        onClearFeedback={vi.fn()}
      />
    );

    const stopButton = screen.getByRole("button", { name: "Stop" });
    expect(stopButton).toBeInTheDocument();
    expect(stopButton).toHaveTextContent("");
    expect(stopButton.querySelector("svg")).not.toBeNull();
  });
});
