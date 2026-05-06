import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  UiTimelineBadge,
  UiTimelineEntry,
  UiTimelineEntryDisplay,
  UiTimelineProgress
} from "../../lib/types";
import { BubbleTimeline } from "./BubbleTimeline";

function display(
  overrides: Partial<UiTimelineEntryDisplay> = {}
): UiTimelineEntryDisplay {
  return {
    title: "Display summary.",
    summaryText: "Display summary.",
    summarySource: "summary",
    senderLabel: "codex",
    role: "implementer",
    rowKind: "normal",
    tone: "neutral",
    badges: [],
    progress: null,
    validationFailure: null,
    syntheticApproval: null,
    ...overrides
  };
}

function entry(
  overrides: Partial<Omit<UiTimelineEntry, "display">> & {
    display?: Partial<UiTimelineEntryDisplay>;
    badges?: UiTimelineBadge[];
    progress?: UiTimelineProgress | null;
  } = {}
): UiTimelineEntry {
  const resolvedDisplay = display({
    ...overrides.display,
    badges: overrides.badges ?? overrides.display?.badges ?? [],
    progress: overrides.progress ?? overrides.display?.progress ?? null
  });
  return {
    id: "env-1",
    ts: "2026-02-24T12:01:00.000Z",
    round: 3,
    type: "TASK",
    sender: "orchestrator",
    recipient: "codex",
    payload: {},
    refs: [],
    ...overrides,
    display: resolvedDisplay
  };
}

describe("BubbleTimeline", () => {
  it("renders summary text only from display fields", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-display-conflict",
            payload: {
              summary: "Raw summary must not render.",
              message: "Raw message must not render."
            },
            display: {
              title: "Display summary wins.",
              summaryText: "Display summary wins.",
              senderLabel: "display-sender"
            }
          }),
          entry({
            id: "env-missing-display",
            payload: {
              summary: "Raw fallback must not render."
            },
            display: {
              title: "",
              summaryText: "",
              summarySource: "neutral"
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(screen.getByText("Display summary wins.")).toBeInTheDocument();
    expect(screen.queryByText("Raw summary must not render.")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw message must not render.")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw fallback must not render.")).not.toBeInTheDocument();
  });

  it("renders sender, role, and blocked state from display fields", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-blocked",
            type: "HUMAN_QUESTION",
            payload: {
              question: "Raw question loses."
            },
            display: {
              title: "Display blocked text.",
              summaryText: "Display blocked text.",
              senderLabel: "display-human",
              role: "human",
              rowKind: "blocked",
              tone: "warning"
            }
          }),
          entry({
            id: "env-reviewer",
            type: "PASS",
            sender: "codex",
            payload: {
              summary: "Raw summary loses."
            },
            display: {
              title: "Display reviewer text.",
              summaryText: "Display reviewer text.",
              senderLabel: "claude",
              role: "reviewer"
            }
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
    expect(within(blockedRow as HTMLElement).queryByText("Raw question loses.")).not.toBeInTheDocument();

    const reviewerRow = screen.getByText("Display reviewer text.").closest("div.flex.items-start");
    expect(reviewerRow).not.toBeNull();
    expect(within(reviewerRow as HTMLElement).getByText("reviewer")).toHaveTextContent(
      /reviewer \(claude\)/u
    );
    expect(within(reviewerRow as HTMLElement).queryByText("Raw summary loses.")).not.toBeInTheDocument();
  });

  it("renders badge chips from display fields over conflicting raw data", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-badges",
            type: "APPROVAL_DECISION",
            payload: {
              decision: "rework",
              findings: [{ title: "raw finding", severity: "P0" }]
            },
            badges: [
              { kind: "finding", label: "P2", tone: "warning" },
              { kind: "decision", label: "approve", tone: "success" },
              { kind: "recommendation", label: "inconclusive", tone: "warning" }
            ]
          }),
          entry({
            id: "env-empty-badges",
            type: "APPROVAL_DECISION",
            payload: {
              decision: "rework",
              findings: [{ title: "raw finding", severity: "P1" }]
            },
            display: {
              title: "No display badges.",
              summaryText: "No display badges."
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
    expect(screen.getByText("inconclusive")).toBeInTheDocument();
    expect(screen.queryByText("P0")).not.toBeInTheDocument();

    const emptyBadgeRow = screen.getByText("No display badges.").closest("div.flex.items-start");
    expect(emptyBadgeRow).not.toBeNull();
    expect(within(emptyBadgeRow as HTMLElement).queryByText("P1")).not.toBeInTheDocument();
    expect(within(emptyBadgeRow as HTMLElement).queryByText("rework")).not.toBeInTheDocument();
  });

  it("renders reviewer clean indicators from display badges only", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-clean-display",
            type: "PASS",
            payload: {
              findings: []
            },
            display: {
              title: "Clean reviewer pass.",
              summaryText: "Clean reviewer pass.",
              senderLabel: "claude",
              role: "reviewer",
              badges: [{ kind: "status", label: "clean", tone: "success" }]
            }
          }),
          entry({
            id: "env-clean-raw-only",
            type: "PASS",
            payload: {
              findings: []
            },
            display: {
              title: "Raw clean is hidden.",
              summaryText: "Raw clean is hidden.",
              senderLabel: "claude",
              role: "reviewer",
              badges: []
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const cleanRow = screen.getByText("Clean reviewer pass.").closest("div.flex.items-start");
    expect(cleanRow).not.toBeNull();
    expect(within(cleanRow as HTMLElement).getByText("clean")).toBeInTheDocument();

    const rawOnlyRow = screen.getByText("Raw clean is hidden.").closest("div.flex.items-start");
    expect(rawOnlyRow).not.toBeNull();
    expect(within(rawOnlyRow as HTMLElement).queryByText("clean")).not.toBeInTheDocument();
  });

  it("splits presenter-provided synthetic approval descriptors", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-gate-failed",
            type: "APPROVAL_DECISION",
            sender: "orchestrator",
            display: {
              title: "Validation failed.",
              summaryText: "Validation failed.",
              senderLabel: "orchestrator",
              role: "meta_reviewer",
              rowKind: "gate_failure",
              tone: "danger",
              badges: [{ kind: "decision", label: "rework", tone: "danger" }],
              validationFailure: {
                summaryText: "Validation failed.",
                tone: "danger"
              },
              syntheticApproval: {
                kind: "meta_review_approval",
                sourceEntryId: "env-gate-failed",
                syntheticEntryId: "env-gate-failed:synthetic-approve",
                label: "Meta-review approved the current change.",
                tone: "success"
              }
            }
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
    const metaRow = metaLabel.closest("div.flex.items-start");
    expect(metaRow).not.toBeNull();
    expect(
      within(metaRow as HTMLElement).getByText("Meta-review approved the current change.")
    ).toBeInTheDocument();
    expect(within(metaRow as HTMLElement).getByText("approve")).toBeInTheDocument();
    expect(within(metaRow as HTMLElement).queryByText("rework")).not.toBeInTheDocument();

    const systemLabel = screen.getByText("orchestrator", {
      selector: "span.font-medium"
    });
    expect(systemLabel).toHaveTextContent("orchestrator (gate failed)");
    const systemRow = systemLabel.closest("div.flex.items-start");
    expect(systemRow).not.toBeNull();
    expect(within(systemRow as HTMLElement).getByText("Validation failed.")).toBeInTheDocument();
    expect(within(systemRow as HTMLElement).getByText("rework")).toBeInTheDocument();
  });

  it("uses display progress for clean-run sequencing and handoff rows", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-clean-1",
            type: "APPROVAL_REQUEST",
            display: {
              title: "First clean.",
              summaryText: "First clean.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "approval"
            },
            badges: [{ kind: "recommendation", label: "approve", tone: "success" }],
            progress: {
              kind: "clean_run",
              label: "producer clean label",
              cleanRunCount: 1,
              cleanRunsRequired: 3
            }
          }),
          entry({
            id: "env-rerun",
            type: "TASK",
            display: {
              title: "Rerun handoff.",
              summaryText: "Rerun handoff.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "handoff",
              tone: "info"
            },
            progress: {
              kind: "meta_review_handoff",
              label: "handoff 2",
              handoffAttempt: 2
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(screen.getByText("producer clean label")).toBeInTheDocument();
    expect(screen.getByText("clean 2")).toBeInTheDocument();
    expect(screen.queryByText("approve")).not.toBeInTheDocument();
  });

  it("does not render superseded handoff display rows as normal messages", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-stale-handoff",
            type: "TASK",
            display: {
              title: "Stale handoff must not render.",
              summaryText: "Stale handoff must not render.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "handoff",
              tone: "info"
            }
          }),
          entry({
            id: "env-current-handoff",
            type: "TASK",
            display: {
              title: "Current handoff.",
              summaryText: "Current handoff.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "handoff",
              tone: "info"
            },
            progress: {
              kind: "meta_review_handoff",
              label: "handoff 2",
              handoffAttempt: 2
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={3}
      />
    );

    expect(screen.queryByText("Stale handoff must not render.")).not.toBeInTheDocument();
    expect(screen.getByText("clean 1")).toBeInTheDocument();
  });

  it("does not synthesize clean-run chips from stale raw recommendation data", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-stale-raw-approve",
            type: "APPROVAL_REQUEST",
            payload: {
              summary: "Raw approve must not render.",
              metadata: {
                recommendation: "approve"
              }
            } as never,
            display: {
              title: "Display omits approve.",
              summaryText: "Display omits approve.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "approval",
              badges: []
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={2}
      />
    );

    expect(screen.getByText("Display omits approve.")).toBeInTheDocument();
    expect(screen.queryByText("Raw approve must not render.")).not.toBeInTheDocument();
    expect(screen.queryByText("clean 1")).not.toBeInTheDocument();
    expect(screen.queryByText("approve")).not.toBeInTheDocument();
  });

  it("does not synthesize clean-run chips from display approve badges without progress", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-superseded-approve",
            type: "APPROVAL_REQUEST",
            display: {
              title: "Superseded approve row.",
              summaryText: "Superseded approve row.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "approval"
            },
            badges: [{ kind: "recommendation", label: "approve", tone: "success" }]
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={2}
      />
    );

    expect(screen.getByText("Superseded approve row.")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.queryByText("clean 1")).not.toBeInTheDocument();
  });

  it("does not reset clean-run sequencing from stale raw decisions", () => {
    render(
      <BubbleTimeline
        entries={[
          entry({
            id: "env-display-clean-1",
            type: "APPROVAL_REQUEST",
            display: {
              title: "Display clean one.",
              summaryText: "Display clean one.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "approval"
            },
            badges: [{ kind: "recommendation", label: "approve", tone: "success" }],
            progress: {
              kind: "clean_run",
              label: "clean 1",
              cleanRunCount: 1,
              cleanRunsRequired: 3
            }
          }),
          entry({
            id: "env-stale-raw-rework",
            type: "APPROVAL_DECISION",
            payload: {
              decision: "rework",
              message: "Raw rework must not reset display state."
            },
            display: {
              title: "Display decision approve.",
              summaryText: "Display decision approve.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "approval",
              badges: [{ kind: "decision", label: "approve", tone: "success" }]
            }
          }),
          entry({
            id: "env-display-clean-2",
            type: "APPROVAL_REQUEST",
            display: {
              title: "Display clean two.",
              summaryText: "Display clean two.",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "approval"
            },
            badges: [{ kind: "recommendation", label: "approve", tone: "success" }],
            progress: {
              kind: "clean_run",
              label: "clean 2",
              cleanRunCount: 2,
              cleanRunsRequired: 3
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={3}
      />
    );

    expect(screen.getByText("clean 1")).toBeInTheDocument();
    expect(screen.getByText("clean 2")).toBeInTheDocument();
    expect(screen.getByText("Display decision approve.")).toBeInTheDocument();
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
      entry({
        id: `env-${index}`,
        ts: `2026-03-08T10:00:0${index}.000Z`,
        display: {
          title: `Entry ${index}`,
          summaryText: `Entry ${index}`
        }
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
          entry({
            id: "env-append",
            ts: "2026-03-08T10:00:10.000Z",
            display: {
              title: "Appended",
              summaryText: "Appended"
            }
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
