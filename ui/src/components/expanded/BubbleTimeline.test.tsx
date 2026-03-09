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

    const actorLabel = screen.getByText("orchestrator", {
      selector: "span.font-medium"
    });

    expect(actorLabel).toHaveTextContent(/orchestrator\s*\(meta-reviewer\)/u);
    expect(screen.getByText("MR rework")).toBeInTheDocument();
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

  it("renders extras inside the same scroll container as timeline entries", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-1",
            sender: "implementer"
          })
        ]}
        isLoading={false}
        error={null}
        compact
        extras={<div data-testid="timeline-extras">Meta Review</div>}
      />
    );

    const scroller = screen.getByTestId("bubble-timeline-scroll");
    expect(scroller).toContainElement(screen.getByTestId("timeline-extras"));
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
