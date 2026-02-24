import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BubbleExpandedPanel } from "./BubbleExpandedPanel";
import { bubbleCard, bubbleDetail, timelineEntry } from "../../test/fixtures";

describe("BubbleExpandedPanel", () => {
  it("renders detail and timeline content", () => {
    render(
      <BubbleExpandedPanel
        bubble={bubbleCard({ bubbleId: "b-1", repoPath: "/repo-a", state: "WAITING_HUMAN" })}
        detail={bubbleDetail({ bubbleId: "b-1", repoPath: "/repo-a", state: "WAITING_HUMAN" })}
        timeline={[timelineEntry()]}
        detailLoading={false}
        timelineLoading={false}
        detailError={null}
        timelineError={null}
        actionLoading={false}
        actionError={null}
        actionRetryHint={null}
        actionFailure={null}
        onClose={vi.fn()}
        onRefresh={vi.fn(async () => undefined)}
        onAction={vi.fn(async () => undefined)}
        onAttach={vi.fn(async () => undefined)}
        onClearActionFeedback={vi.fn()}
      />
    );

    expect(screen.getByText("b-1")).toBeInTheDocument();
    expect(screen.getByText("Inbox total:")).toBeInTheDocument();
    expect(screen.getByText("Need confirmation")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Can you proceed?")).toBeInTheDocument();
  });

  it("surfaces open failures in expanded view", () => {
    render(
      <BubbleExpandedPanel
        bubble={bubbleCard({ bubbleId: "b-1", repoPath: "/repo-a", state: "RUNNING" })}
        detail={null}
        timeline={[]}
        detailLoading={false}
        timelineLoading={false}
        detailError={null}
        timelineError={null}
        actionLoading={false}
        actionError="worktree path missing"
        actionRetryHint={null}
        actionFailure="open"
        onClose={vi.fn()}
        onRefresh={vi.fn(async () => undefined)}
        onAction={vi.fn(async () => undefined)}
        onAttach={vi.fn(async () => undefined)}
        onClearActionFeedback={vi.fn()}
      />
    );

    expect(screen.getByText("Open failed")).toBeInTheDocument();
    expect(screen.getAllByText("worktree path missing")).toHaveLength(1);
  });

  it("refreshes panel data on refresh click", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn(async () => undefined);

    render(
      <BubbleExpandedPanel
        bubble={bubbleCard({ bubbleId: "b-1", repoPath: "/repo-a", state: "RUNNING" })}
        detail={null}
        timeline={[]}
        detailLoading={false}
        timelineLoading={false}
        detailError={null}
        timelineError={null}
        actionLoading={false}
        actionError={null}
        actionRetryHint={null}
        actionFailure={null}
        onClose={vi.fn()}
        onRefresh={onRefresh}
        onAction={vi.fn(async () => undefined)}
        onAttach={vi.fn(async () => undefined)}
        onClearActionFeedback={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
