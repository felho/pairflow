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
  commit: "Commit",
  merge: "Merge",
  open: "Open",
  attach: "Attach",
  stop: "Stop"
};

const expectedMatrix: Record<BubbleLifecycleState, BubbleActionKind[]> = {
  CREATED: ["start", "stop"],
  PREPARING_WORKSPACE: ["stop"],
  RUNNING: ["open", "stop"],
  WAITING_HUMAN: ["reply", "resume", "open", "stop"],
  READY_FOR_APPROVAL: ["approve", "request-rework", "open", "stop"],
  APPROVED_FOR_COMMIT: ["commit", "open", "stop"],
  COMMITTED: ["open", "stop"],
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
      const onAction = vi.fn(async () => undefined);
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
        const button = screen.queryByRole("button", { name: actionLabels[action] });
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
    const onAction = vi.fn(async () => undefined);

    render(
      <ActionBar
        bubble={bubbleCard({
          bubbleId: "b-ready",
          repoPath: "/repo-a",
          state: "READY_FOR_APPROVAL"
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

  it("submits commit form with default auto=true", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn(async () => undefined);

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
    const onAction = vi.fn(async () => undefined);

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
    expect(screen.getByText("Opening Warp terminal...")).toBeInTheDocument();
  });
});
