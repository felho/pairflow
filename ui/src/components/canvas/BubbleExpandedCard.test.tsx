import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { copyToClipboardMock } = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn<(text: string) => Promise<void>>()
}));

vi.mock("../../lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock
}));

import { bubbleDimensions } from "../../lib/canvasLayout";
import { bubbleCard, bubbleDetail } from "../../test/fixtures";
import { BubbleExpandedCard } from "./BubbleExpandedCard";

interface RenderExpandedCardOverrides {
  onPositionChange?: (position: { x: number; y: number }) => void;
  onPositionCommit?: () => void;
  onClose?: () => void;
  detail?: ReturnType<typeof bubbleDetail> | null;
  bubbleState?: "READY_FOR_APPROVAL" | "READY_FOR_HUMAN_APPROVAL";
}

function renderExpandedCard(overrides: RenderExpandedCardOverrides = {}): void {
  render(
    <BubbleExpandedCard
      bubble={bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        ...(overrides.bubbleState !== undefined
          ? { state: overrides.bubbleState }
          : {})
      })}
      detail={overrides.detail ?? null}
      timeline={null}
      position={{
        x: 72,
        y: 96
      }}
      detailLoading={false}
      timelineLoading={false}
      detailError={null}
      timelineError={null}
      actionLoading={false}
      actionError={null}
      actionRetryHint={null}
      actionFailure={null}
      onPositionChange={overrides.onPositionChange ?? (() => undefined)}
      onPositionCommit={overrides.onPositionCommit ?? (() => undefined)}
      onClose={overrides.onClose ?? (() => undefined)}
      onRefresh={() => undefined}
      onAction={vi.fn(() => Promise.resolve())}
      onClearActionFeedback={() => undefined}
    />
  );
}

describe("BubbleExpandedCard", () => {
  const bubbleReviewPrompt =
    "b-expanded-1: review the bubble, deep mode, be very verbose";

  beforeEach(() => {
    copyToClipboardMock.mockReset();
    copyToClipboardMock.mockResolvedValue(undefined);
  });

  it("renders with expanded layout dimensions", () => {
    const expandedDimensions = bubbleDimensions(true);

    renderExpandedCard();

    expect(screen.getByRole("article")).toHaveStyle({
      left: "72px",
      top: "96px",
      width: `${expandedDimensions.width}px`,
      height: `${expandedDimensions.height}px`
    });
  });

  it("shows meta-review actor and latest recommendation in detail surface", () => {
    renderExpandedCard({
      bubbleState: "READY_FOR_HUMAN_APPROVAL",
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL"
      })
    });

    expect(screen.getByText("Meta Review")).toBeInTheDocument();
    expect(screen.getByText("Actor: meta-reviewer")).toBeInTheDocument();
    expect(screen.getByText("Latest recommendation: approve")).toBeInTheDocument();
    expect(screen.getByText("Approval Package")).toBeInTheDocument();
  });

  it("copies bubble review prompt on double click of expanded bubble id label", async () => {
    renderExpandedCard();

    fireEvent.doubleClick(screen.getByText("b-expanded-1"));

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
      expect(copyToClipboardMock).toHaveBeenCalledWith(bubbleReviewPrompt);
    });
  });

  it("copies bubble review prompt on double click of expanded repo label", async () => {
    renderExpandedCard();

    fireEvent.doubleClick(screen.getByText("repo-a"));

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
      expect(copyToClipboardMock).toHaveBeenCalledWith(bubbleReviewPrompt);
    });
  });

  it("shows and dismisses copy error feedback when clipboard write fails", async () => {
    copyToClipboardMock.mockRejectedValueOnce(
      new Error("Clipboard permission denied")
    );
    renderExpandedCard();

    fireEvent.doubleClick(screen.getByText("b-expanded-1"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Copy bubble ID failed (b-expanded-1): Clipboard permission denied"
        )
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss copy error" }));
    expect(
      screen.queryByText(
        "Copy bubble ID failed (b-expanded-1): Clipboard permission denied"
      )
    ).not.toBeInTheDocument();
  });

  it("does not start drag from close button mousedown", () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();
    const onClose = vi.fn();
    renderExpandedCard({
      onPositionChange,
      onPositionCommit,
      onClose
    });

    const closeButton = screen.getByRole("button", { name: "Close expanded card" });
    fireEvent.mouseDown(closeButton, { button: 0, clientX: 150, clientY: 150 });
    fireEvent.mouseMove(document, { clientX: 4, clientY: 4 });
    fireEvent.mouseUp(document);
    fireEvent.click(closeButton);

    expect(onPositionChange).not.toHaveBeenCalled();
    expect(onPositionCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not start drag from bubble id double-click target", async () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();
    renderExpandedCard({
      onPositionChange,
      onPositionCommit
    });

    const idLabel = screen.getByText("b-expanded-1");
    fireEvent.mouseDown(idLabel, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.mouseMove(document, { clientX: 8, clientY: 8 });
    fireEvent.mouseUp(document);
    fireEvent.doubleClick(idLabel);

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
    });
    expect(onPositionChange).not.toHaveBeenCalled();
    expect(onPositionCommit).not.toHaveBeenCalled();
  });
});
