import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { timelineEntry } from "../../test/fixtures";
import { BubbleTimeline } from "./BubbleTimeline";

describe("BubbleTimeline", () => {
  it("renders meta-reviewer actor as first-class role", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-meta-1",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Meta-review completed",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "rework"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(
      screen.getByText(/orchestrator\s*\(meta-reviewer\)/u)
    ).toBeInTheDocument();
  });

  it("shows empty-state text when no timeline entries exist", () => {
    render(
      <BubbleTimeline
        entries={[]}
        isLoading={false}
        error={null}
        compact
      />
    );

    expect(screen.getByText("No timeline entries yet.")).toBeInTheDocument();
  });

  it("prioritizes error rendering over loading when both are present", () => {
    render(
      <BubbleTimeline
        entries={null}
        isLoading
        error="Network down"
        compact
      />
    );

    expect(screen.getByText("Failed to load timeline: Network down")).toBeInTheDocument();
    expect(screen.queryByText("Loading timeline...")).not.toBeInTheDocument();
  });

  it("preserves manual scroll position when user scrolls away from bottom", () => {
    const firstEntries = Array.from({ length: 5 }, (_, index) =>
      timelineEntry({
        id: `env-${index}`,
        ts: `2026-03-08T10:00:0${index}.000Z`
      })
    );
    const { rerender } = render(
      <BubbleTimeline
        entries={firstEntries}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const scroller = screen.getByTestId("bubble-timeline-scroll");
    let scrollTop = 120;
    Object.defineProperty(scroller, "scrollHeight", {
      value: 1000,
      configurable: true
    });
    Object.defineProperty(scroller, "clientHeight", {
      value: 200,
      configurable: true
    });
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      }
    });
    fireEvent.scroll(scroller);

    Object.defineProperty(scroller, "scrollHeight", {
      value: 1400,
      configurable: true
    });

    rerender(
      <BubbleTimeline
        entries={[
          ...firstEntries,
          timelineEntry({ id: "env-append", ts: "2026-03-08T10:00:10.000Z" })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(scrollTop).toBe(120);
  });
});
