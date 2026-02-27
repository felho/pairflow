import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { bubbleDimensions } from "../../lib/canvasLayout";
import { bubbleCard } from "../../test/fixtures";
import { BubbleExpandedCard } from "./BubbleExpandedCard";

describe("BubbleExpandedCard", () => {
  it("renders with expanded layout dimensions", () => {
    const expandedDimensions = bubbleDimensions(true);

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

    expect(screen.getByRole("article")).toHaveStyle({
      left: "72px",
      top: "96px",
      width: `${expandedDimensions.width}px`,
      height: `${expandedDimensions.height}px`
    });
  });
});
