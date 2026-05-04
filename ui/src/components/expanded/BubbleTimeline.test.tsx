import { fireEvent, render, screen, within } from "@testing-library/react";
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

    const actorLabel = screen.getByText("meta-reviewer", {
      selector: "span.font-medium"
    });

    expect(actorLabel).toHaveTextContent(/meta-reviewer/u);
    expect(actorLabel).toHaveTextContent(/\(orchestrator\)/u);
    expect(screen.getByText("rework")).toBeInTheDocument();
  });

  it("keeps implementer role for passes delivered to the meta-reviewer", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-impl-to-meta",
            type: "PASS",
            sender: "codex",
            recipient: "codex",
            payload: {
              summary: "Ready for meta-review.",
              pass_intent: "review",
              metadata: {
                delivery_target_role: "meta_reviewer"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact
      />
    );

    const actorLabel = screen.getByText("implementer", {
      selector: "span.font-medium"
    });

    expect(actorLabel).toHaveTextContent(/implementer/u);
    expect(actorLabel).toHaveTextContent(/\(codex\)/u);
    expect(
      screen.queryByText("meta-reviewer", { selector: "span.font-medium" })
    ).not.toBeInTheDocument();
  });

  it("renders only rerun meta-review gate handoffs as clean-run progress", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-meta-gate-1",
            type: "TASK",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              summary: "Meta-review gate opened.",
              metadata: {
                delivery_target_role: "meta_reviewer",
                actor: "meta-review-gate",
                actor_agent: "orchestrator",
                meta_review_handoff_id:
                  "meta_review:b-meta-gate:round:4:attempt:1"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-gate-2",
            type: "TASK",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              summary: "Meta-review gate opened again.",
              metadata: {
                delivery_target_role: "meta_reviewer",
                actor: "meta-review-gate",
                actor_agent: "orchestrator",
                meta_review_handoff_id:
                  "meta_review:b-meta-gate:round:4:attempt:2"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-approve-2",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Second clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                actor_agent: "codex",
                latest_recommendation: "approve"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact
        metaReviewCleanRunsRequired={2}
      />
    );

    const metaRows = screen.getAllByText("meta-reviewer", {
      selector: "span.font-medium"
    });
    expect(metaRows).toHaveLength(2);
    expect(metaRows[0]).toHaveTextContent(/\(codex\)/u);
    expect(metaRows[1]).toHaveTextContent(/\(codex\)/u);
    expect(screen.getByText("clean 1")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.queryByText("Meta-review gate opened.")).not.toBeInTheDocument();
  });

  it("uses meta-review handoff attempt when the first kickoff row is absent", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-implementer-pass",
            type: "PASS",
            sender: "codex",
            recipient: "codex",
            payload: {
              summary: "Ready for meta-review.",
              metadata: {
                delivery_target_role: "meta_reviewer"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-gate-2",
            type: "TASK",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              summary: "Meta-review gate opened again.",
              metadata: {
                delivery_target_role: "meta_reviewer",
                actor: "meta-review-gate",
                actor_agent: "orchestrator",
                meta_review_handoff_id:
                  "meta_review:b-meta-gate:round:4:attempt:2"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-approve-2",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Second clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                actor_agent: "codex",
                latest_recommendation: "approve"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact
        metaReviewCleanRunsRequired={2}
      />
    );

    expect(screen.getByText("clean 1")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
  });

  it("does not render a clean-run progress row for a final single-run approval after prior rework", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-meta-rework",
            type: "APPROVAL_DECISION",
            round: 2,
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              decision: "rework",
              message: "Apply rework.",
              metadata: {
                actor: "meta-reviewer",
                recommendation: "rework"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-gate-after-rework",
            type: "TASK",
            round: 6,
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              summary: "Meta-review gate opened after rework.",
              metadata: {
                delivery_target_role: "meta_reviewer",
                actor: "meta-review-gate",
                actor_agent: "orchestrator",
                meta_review_handoff_id:
                  "meta_review:b-meta-gate:round:6:attempt:2"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-approve",
            type: "APPROVAL_REQUEST",
            round: 6,
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Clean meta-review approved.",
              metadata: {
                actor: "meta-reviewer",
                actor_agent: "codex",
                latest_recommendation: "approve"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={1}
      />
    );

    const metaRows = screen.getAllByText("meta-reviewer", {
      selector: "span.font-medium"
    });
    expect(metaRows).toHaveLength(2);
    expect(screen.getByText("rework")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.queryByText("clean 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Meta-review gate opened after rework.")).not.toBeInTheDocument();
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

  it("deduplicates rework tag when decision and recommendation are the same", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-decision-1",
            type: "APPROVAL_DECISION",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              decision: "rework",
              message: "Apply rework.",
              metadata: {
                actor: "meta-reviewer",
                recommendation: "rework"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const reworkBadges = screen
      .getAllByText("rework")
      .filter((node) => node.className.includes("inline-block"));
    expect(reworkBadges).toHaveLength(1);
  });

  it("splits meta-review approval from orchestrator gate-failed rework", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-gate-failed-rework",
            type: "APPROVAL_DECISION",
            round: 2,
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              decision: "rework",
              message:
                "Meta-review approved the current change, but the required approve-gate validation failed.",
              metadata: {
                actor: "meta-reviewer",
                actor_agent: "codex",
                recommendation: "approve"
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
    expect(metaLabel).toHaveTextContent(/\(codex\)/u);
    const metaRow = metaLabel.closest("div.flex.items-start");
    expect(metaRow).not.toBeNull();
    expect(within(metaRow as HTMLElement).getByText("approve")).toBeInTheDocument();
    expect(within(metaRow as HTMLElement).queryByText("rework")).not.toBeInTheDocument();

    const orchestratorLabel = screen.getByText("orchestrator", {
      selector: "span.font-medium"
    });
    expect(orchestratorLabel).toHaveTextContent("orchestrator (gate failed)");
    const orchestratorRow = orchestratorLabel.closest("div.flex.items-start");
    expect(orchestratorRow).not.toBeNull();
    expect(within(orchestratorRow as HTMLElement).getByText("rework")).toBeInTheDocument();
    expect(within(orchestratorRow as HTMLElement).queryByText("approve")).not.toBeInTheDocument();
  });

  it("renders severity tags from payload findings on meta-review auto-rework rows", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-decision-findings-1",
            type: "APPROVAL_DECISION",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              decision: "rework",
              message: "Apply rework.",
              findings: [
                { title: "blocking", severity: "P1" },
                { title: "advisory", severity: "P3" },
                { title: "duplicate", severity: "P1" }
              ],
              metadata: {
                actor: "meta-reviewer",
                recommendation: "rework"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const reworkBadges = screen
      .getAllByText("rework")
      .filter((node) => node.className.includes("inline-block"));

    expect(reworkBadges).toHaveLength(1);
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P3")).toBeInTheDocument();
  });

  it("renders clean-run count instead of approve until the required streak is met", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-meta-clean-1",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "First clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-clean-2",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Second clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={2}
      />
    );

    expect(screen.getByText("clean 1")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.queryByText("clean 2")).not.toBeInTheDocument();
  });

  it("renders intermediate clean-run counts for longer clean-run requirements", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-meta-clean-1",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "First clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-clean-2",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Second clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-clean-3",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Third clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
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
    expect(screen.getByText("approve")).toBeInTheDocument();
  });

  it("resets clean-run count after a meta-review rework recommendation", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-meta-clean-1",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "First clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-rework",
            type: "APPROVAL_DECISION",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              decision: "rework",
              message: "Apply rework.",
              metadata: {
                actor: "meta-reviewer",
                recommendation: "rework"
              }
            }
          }),
          timelineEntry({
            id: "env-meta-clean-2",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Clean after rework.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
        metaReviewCleanRunsRequired={2}
      />
    );

    const cleanOneBadges = screen
      .getAllByText("clean 1")
      .filter((node) => node.className.includes("inline-block"));
    expect(cleanOneBadges).toHaveLength(2);
    expect(screen.queryByText("approve")).not.toBeInTheDocument();
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

  it("keeps loaded timeline visible during refresh", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-refresh-1",
            sender: "implementer",
            payload: {
              summary: "Remote smoke running."
            }
          })
        ]}
        isLoading
        error={null}
        compact={false}
      />
    );

    expect(screen.getByText("Remote smoke running.")).toBeInTheDocument();
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
