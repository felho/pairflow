import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActionBar } from "./ActionBar";
import { bubbleCard } from "../../test/fixtures";
import type { BubbleActionKind, BubbleLifecycleState } from "../../lib/types";

const actionLabels: Record<Exclude<BubbleActionKind, "delete">, string> = {
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

function resolveActionLabelForState(
  state: BubbleLifecycleState,
  action: Exclude<BubbleActionKind, "delete">
): string {
  if (state === "WAITING_HUMAN" && action === "request-rework") {
    return "Queue Rework";
  }
  return actionLabels[action];
}

const expectedMatrix: Record<BubbleLifecycleState, BubbleActionKind[]> = {
  CREATED: ["start", "stop"],
  PREPARING_WORKSPACE: ["stop"],
  RUNNING: ["restart", "open", "stop"],
  WAITING_HUMAN: ["request-rework", "reply", "resume", "restart", "open", "stop"],
  READY_FOR_HUMAN_APPROVAL: ["approve", "request-rework", "restart", "open", "stop"],
  APPROVED_FOR_COMMIT: ["commit", "restart", "open", "stop"],
  COMMITTED: ["restart", "open", "stop"],
  DONE: ["merge", "open"],
  FAILED: ["open"],
  CANCELLED: ["open"]
};

describe("ActionBar", () => {
  it("renders only matrix-allowed actions for each lifecycle state", () => {
    const allActions = Object.keys(actionLabels) as Array<
      Exclude<BubbleActionKind, "delete">
    >;

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
});
