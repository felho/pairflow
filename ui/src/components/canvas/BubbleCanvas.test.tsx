import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BubbleCanvas } from "./BubbleCanvas";
import { bubbleCard } from "../../test/fixtures";

describe("BubbleCanvas", () => {
  it("renders cards with mapped runtime status and persisted position", () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();

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
      />
    );

    expect(screen.getByText(/Stale runtime/u)).toBeInTheDocument();

    expect(screen.getByRole("article")).toHaveStyle({
      left: "40px",
      top: "60px"
    });
    expect(screen.getByRole("main")).toHaveStyle({
      minHeight: "560px"
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
      />
    );

    expect(screen.getByText("No bubbles in current repo filter.")).toBeInTheDocument();
  });
});
