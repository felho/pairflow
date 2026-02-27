import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BubbleCanvas } from "./BubbleCanvas";
import { bubbleDimensions } from "../../lib/canvasLayout";
import { bubbleCard } from "../../test/fixtures";

function deletedResult(bubbleId: string) {
  return {
    bubbleId,
    deleted: true,
    requiresConfirmation: false,
    artifacts: {
      worktree: {
        exists: false,
        path: ""
      },
      tmux: {
        exists: false,
        sessionName: `pf-${bubbleId}`
      },
      runtimeSession: {
        exists: false,
        sessionName: null
      },
      branch: {
        exists: false,
        name: `pairflow/bubble/${bubbleId}`
      }
    },
    tmuxSessionTerminated: false,
    runtimeSessionRemoved: false,
    removedWorktree: false,
    removedBubbleBranch: false
  };
}

function requiresConfirmationResult(bubbleId: string) {
  return {
    bubbleId,
    deleted: false,
    requiresConfirmation: true,
    artifacts: {
      worktree: {
        exists: true,
        path: `/tmp/worktrees/${bubbleId}`
      },
      tmux: {
        exists: true,
        sessionName: `pf-${bubbleId}`
      },
      runtimeSession: {
        exists: true,
        sessionName: `pf-${bubbleId}`
      },
      branch: {
        exists: true,
        name: `pairflow/bubble/${bubbleId}`
      }
    },
    tmuxSessionTerminated: false,
    runtimeSessionRemoved: false,
    removedWorktree: false,
    removedBubbleBranch: false
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve: ((value: T) => void) | null = null;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  if (resolve === null) {
    throw new Error("Failed to create deferred resolver");
  }
  return { promise, resolve };
}

describe("BubbleCanvas", () => {
  it("renders cards with mapped runtime status and persisted position", () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();
    const collapsedDimensions = bubbleDimensions(false);

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a",
            stale: true
          })
        ]}
        positions={{
          "b-1": {
            x: 40,
            y: 60
          }
        }}
        expandedBubbleIds={[]}
        onPositionChange={onPositionChange}
        onPositionCommit={onPositionCommit}
        onToggleExpand={() => undefined}
        onDelete={(bubbleId) => Promise.resolve(deletedResult(bubbleId))}
      />
    );

    expect(screen.getByText(/Stale runtime/u)).toBeInTheDocument();

    expect(screen.getByRole("article")).toHaveStyle({
      left: "40px",
      top: "60px",
      width: `${collapsedDimensions.width}px`,
      height: `${collapsedDimensions.height}px`
    });
    expect(screen.getByRole("main")).toHaveStyle({
      minHeight: "560px",
      minWidth: `${40 + collapsedDimensions.width + 24}px`
    });
    expect(onPositionChange).not.toHaveBeenCalled();
    expect(onPositionCommit).not.toHaveBeenCalled();
  });

  it("resets drag status after mouseup", () => {
    const onPositionCommit = vi.fn();
    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={onPositionCommit}
        onToggleExpand={() => undefined}
        onDelete={(bubbleId) => Promise.resolve(deletedResult(bubbleId))}
      />
    );

    const dragHandle = screen.getByRole("button", {
      name: "Bubble b-1 drag handle"
    });
    fireEvent.mouseDown(dragHandle, {
      button: 0,
      clientX: 20,
      clientY: 20
    });

    expect(screen.getByText("Dragging bubble")).toBeInTheDocument();

    fireEvent.mouseUp(document, {
      clientX: 20,
      clientY: 20
    });

    expect(screen.getByText("Canvas ready")).toBeInTheDocument();
    expect(onPositionCommit).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard arrow repositioning from drag handle", () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();
    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{
          "b-1": {
            x: 40,
            y: 60
          }
        }}
        expandedBubbleIds={[]}
        onPositionChange={onPositionChange}
        onPositionCommit={onPositionCommit}
        onToggleExpand={() => undefined}
        onDelete={(bubbleId) => Promise.resolve(deletedResult(bubbleId))}
      />
    );

    const dragHandle = screen.getByRole("button", {
      name: "Bubble b-1 drag handle"
    });

    fireEvent.keyDown(dragHandle, { key: "ArrowRight" });
    expect(onPositionChange).toHaveBeenCalledWith("b-1", { x: 52, y: 60 });
    expect(onPositionCommit).toHaveBeenCalledTimes(1);
  });

  it("commits position on Enter/Space key activation", () => {
    const onPositionCommit = vi.fn();
    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={onPositionCommit}
        onToggleExpand={() => undefined}
        onDelete={(bubbleId) => Promise.resolve(deletedResult(bubbleId))}
      />
    );

    const dragHandle = screen.getByRole("button", {
      name: "Bubble b-1 drag handle"
    });
    fireEvent.keyDown(dragHandle, { key: "Enter" });
    fireEvent.keyDown(dragHandle, { key: " " });

    expect(onPositionCommit).toHaveBeenCalledTimes(2);
  });

  it("shows empty state when filter has no bubbles", () => {
    render(
      <BubbleCanvas
        bubbles={[]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={(bubbleId) => Promise.resolve(deletedResult(bubbleId))}
      />
    );

    expect(screen.getByText("No bubbles in current repo filter.")).toBeInTheDocument();
  });

  it("invokes delete from trash icon without toggling expansion", async () => {
    const onDelete = vi.fn((bubbleId: string) =>
      Promise.resolve(deletedResult(bubbleId))
    );
    const onToggleExpand = vi.fn();

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("b-1", undefined, "/repo-a");
    });
    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  it("ignores repeated delete clicks while a delete request is in flight", async () => {
    const deferred = createDeferred<ReturnType<typeof deletedResult>>();
    const onDelete = vi.fn(() => deferred.promise);

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByRole("button", { name: "Delete bubble b-1" });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);

    deferred.resolve(deletedResult("b-1"));
    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled();
    });
  });

  it("allows dismissing delete error overlay", async () => {
    const onDelete = vi.fn(async () => {
      throw new Error("Delete failed");
    });

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
  });

  it("shows delete confirmation dialog and confirms with force", async () => {
    const onDelete = vi
      .fn()
      .mockResolvedValueOnce(requiresConfirmationResult("b-1"))
      .mockResolvedValueOnce(deletedResult("b-1"));

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          }),
          bubbleCard({
            bubbleId: "b-2",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));

    await waitFor(() => {
      expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
    });
    expect((screen.getByTestId("canvas-content") as HTMLDivElement).inert).toBe(true);
    expect(screen.getByRole("button", { name: "Delete bubble b-2" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-2" }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete with Force" }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenNthCalledWith(2, "b-1", true, "/repo-a");
    });
    expect((screen.getByTestId("canvas-content") as HTMLDivElement).inert).toBe(false);
  });

  it("ignores repeated force-confirm clicks while confirmation delete is in flight", async () => {
    const deferred = createDeferred<ReturnType<typeof deletedResult>>();
    const onDelete = vi
      .fn()
      .mockResolvedValueOnce(requiresConfirmationResult("b-1"))
      .mockImplementationOnce(() => deferred.promise);

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));
    await waitFor(() => {
      expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "Delete with Force" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenNthCalledWith(2, "b-1", true, "/repo-a");

    deferred.resolve(deletedResult("b-1"));
    await waitFor(() => {
      expect(screen.queryByText("Delete Bubble b-1?")).not.toBeInTheDocument();
    });
  });

  it("keeps confirmation dialog open and shows error when force delete does not complete", async () => {
    const onDelete = vi
      .fn()
      .mockResolvedValueOnce(requiresConfirmationResult("b-1"))
      .mockResolvedValueOnce({
        ...deletedResult("b-1"),
        deleted: false,
        requiresConfirmation: false
      });

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));
    await waitFor(() => {
      expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete with Force" }));
    await waitFor(() => {
      expect(screen.getByText("Delete did not complete. Please retry.")).toBeInTheDocument();
    });
    expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
  });

  it("shows fallback error when force delete still requires confirmation", async () => {
    const onDelete = vi
      .fn()
      .mockResolvedValueOnce(requiresConfirmationResult("b-1"))
      .mockResolvedValueOnce(requiresConfirmationResult("b-1"));

    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));
    await waitFor(() => {
      expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete with Force" }));
    await waitFor(() => {
      expect(
        screen.getByText("Force delete still requires confirmation. Please retry or refresh.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
  });

  it("restores focus to delete trigger when dialog closes", async () => {
    const onDelete = vi.fn().mockResolvedValueOnce(requiresConfirmationResult("b-1"));
    render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByRole("button", { name: "Delete bubble b-1" });
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
    });
    expect((screen.getByTestId("canvas-content") as HTMLDivElement).inert).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(deleteButton).toHaveFocus();
    });
    expect((screen.getByTestId("canvas-content") as HTMLDivElement).inert).toBe(false);
  });

  it("dismisses delete confirmation when target bubble disappears from canvas", async () => {
    const onDelete = vi.fn().mockResolvedValueOnce(requiresConfirmationResult("b-1"));
    const view = render(
      <BubbleCanvas
        bubbles={[
          bubbleCard({
            bubbleId: "b-1",
            repoPath: "/repo-a"
          })
        ]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete bubble b-1" }));
    await waitFor(() => {
      expect(screen.getByText("Delete Bubble b-1?")).toBeInTheDocument();
    });

    view.rerender(
      <BubbleCanvas
        bubbles={[]}
        positions={{}}
        expandedBubbleIds={[]}
        onPositionChange={() => undefined}
        onPositionCommit={() => undefined}
        onToggleExpand={() => undefined}
        onDelete={onDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("Delete Bubble b-1?")).not.toBeInTheDocument();
    });
  });
});
