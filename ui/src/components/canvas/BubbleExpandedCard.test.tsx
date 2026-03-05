import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { copyToClipboardMock } = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn<(text: string) => Promise<void>>()
}));

vi.mock("../../lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock
}));

import { bubbleDimensions } from "../../lib/canvasLayout";
import { bubbleCard } from "../../test/fixtures";
import { BubbleExpandedCard } from "./BubbleExpandedCard";

function renderExpandedCard(): void {
  render(
    <BubbleExpandedCard
      bubble={bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a"
      })}
      detail={null}
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
      onPositionChange={() => undefined}
      onPositionCommit={() => undefined}
      onClose={() => undefined}
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
});
