import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  UiTimelineBadge,
  UiTimelineDisplayItem
} from "../../lib/types";
import { BubbleTimeline } from "./BubbleTimeline";

function item(
  overrides: Partial<UiTimelineDisplayItem> & { badges?: UiTimelineBadge[] } = {}
): UiTimelineDisplayItem {
  return {
    id: "env-1",
    sourceEntryId: "env-1",
    ts: "2026-02-24T12:01:00.000Z",
    round: 3,
    role: "implementer",
    senderLabel: "codex",
    title: "Display summary.",
    summaryText: "Display summary.",
    tone: "neutral",
    badges: overrides.badges ?? [],
    cleanRunTag: null,
    gateFailed: false,
    blocked: false,
    convergence: false,
    ...overrides
  };
}

describe("BubbleTimeline", () => {
  it("renders ready display items without interpreting protocol entries", () => {
    render(
      <BubbleTimeline
        entries={[
          item({
            id: "env-blocked",
            role: "human",
            senderLabel: "display-human",
            title: "Display blocked text.",
            summaryText: "Display blocked text.",
            tone: "warning",
            blocked: true
          }),
          item({
            id: "env-reviewer",
            role: "reviewer",
            senderLabel: "claude",
            title: "Display reviewer text.",
            summaryText: "Display reviewer text."
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const blockedRow = screen.getByText("Display blocked text.").closest("div.flex.items-start");
    expect(blockedRow).not.toBeNull();
    expect(
      within(blockedRow as HTMLElement).getByText((content) =>
        content.includes("display-human") && content.includes("blocked")
      )
    ).toBeInTheDocument();

    const reviewerRow = screen.getByText("Display reviewer text.").closest("div.flex.items-start");
    expect(reviewerRow).not.toBeNull();
    expect(within(reviewerRow as HTMLElement).getByText("reviewer")).toHaveTextContent(
      /reviewer \(claude\)/u
    );
  });

  it("renders presenter-owned badges and clean-run tags", () => {
    render(
      <BubbleTimeline
        entries={[
          item({
            id: "env-badges",
            badges: [
              { kind: "finding", label: "P2", tone: "warning" },
              { kind: "decision", label: "approve", tone: "success" }
            ],
            cleanRunTag: {
              label: "clean 1",
              tone: "success"
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.getByText("clean 1")).toBeInTheDocument();
  });

  it("renders presenter-owned synthetic approval and gate-failure rows as separate items", () => {
    render(
      <BubbleTimeline
        entries={[
          item({
            id: "env-gate-failed:synthetic-approve",
            sourceEntryId: "env-gate-failed",
            role: "meta_reviewer",
            senderLabel: "meta-reviewer",
            title: "Meta-review approved the current change.",
            summaryText: "Meta-review approved the current change.",
            tone: "success",
            badges: [{ kind: "recommendation", label: "approve", tone: "success" }]
          }),
          item({
            id: "env-gate-failed",
            role: "system",
            senderLabel: "orchestrator",
            title: "Validation failed.",
            summaryText: "Validation failed.",
            tone: "danger",
            badges: [{ kind: "decision", label: "rework", tone: "danger" }],
            gateFailed: true
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const metaLabel = screen.getByText("meta-reviewer", {
      selector: "span.font-medium"
    });
    expect(metaLabel).toHaveTextContent(/\(meta-reviewer\)/u);
    expect(screen.getByText("Meta-review approved the current change.")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();

    const systemLabel = screen.getByText("orchestrator", {
      selector: "span.font-medium"
    });
    expect(systemLabel).toHaveTextContent("orchestrator (gate failed)");
    expect(screen.getByText("Validation failed.")).toBeInTheDocument();
    expect(screen.getByText("rework")).toBeInTheDocument();
  });

  it("renders convergence rows from display flags", () => {
    render(
      <BubbleTimeline
        entries={[
          item({
            id: "env-convergence",
            role: "system",
            senderLabel: "codex",
            title: "Reviewer converged.",
            summaryText: "Reviewer converged.",
            convergence: true
          })
        ]}
        isLoading={false}
        error={null}
        compact
      />
    );

    expect(screen.getByText("CONVERGENCE")).toBeInTheDocument();
    expect(screen.queryByText("Reviewer converged.")).not.toBeInTheDocument();
  });

  it("renders status states and extras", () => {
    const { rerender } = render(
      <BubbleTimeline
        entries={[]}
        isLoading={false}
        error={null}
        compact
        extras={<div data-testid="timeline-extras">Meta Review</div>}
      />
    );

    expect(screen.getByText("No timeline entries yet.")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-timeline-scroll")).toContainElement(
      screen.getByTestId("timeline-extras")
    );

    rerender(
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

  it("preserves manual scroll position when new entries arrive", () => {
    const firstEntries = Array.from({ length: 5 }, (_, index) =>
      item({
        id: `env-${index}`,
        ts: `2026-03-08T10:00:0${index}.000Z`,
        title: `Entry ${index}`,
        summaryText: `Entry ${index}`
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
          item({
            id: "env-append",
            ts: "2026-03-08T10:00:10.000Z",
            title: "Appended",
            summaryText: "Appended"
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(scrollTop).toBe(120);
  });
});
