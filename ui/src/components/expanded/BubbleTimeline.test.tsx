import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { protocolTimelineEntry, timelineEntry } from "../../test/fixtures";
import { BubbleTimeline } from "./BubbleTimeline";

describe("BubbleTimeline", () => {
  it("renders basic summary text from display fields", () => {
    render(
      <BubbleTimeline
        entries={[
          protocolTimelineEntry({
            id: "env-summary-wins",
            payload: {
              summary: "Summary wins.",
              question: "Question loses.",
              message: "Message loses.",
              decision: "rework"
            }
          }),
          protocolTimelineEntry({
            id: "env-question-fallback",
            payload: {
              question: "Question fallback."
            }
          }),
          protocolTimelineEntry({
            id: "env-message-fallback",
            payload: {
              message: "Message fallback."
            }
          }),
          protocolTimelineEntry({
            id: "env-decision-fallback",
            type: "APPROVAL_DECISION",
            payload: {
              decision: "approve"
            }
          }),
          protocolTimelineEntry({
            id: "env-missing-fallback",
            payload: {}
          }),
          protocolTimelineEntry({
            id: "env-display-conflict",
            payload: {
              summary: "Payload summary must not render.",
              question: "Payload question must not render."
            },
            display: {
              title: "Display summary wins.",
              summaryText: "Display summary wins.",
              summarySource: "summary",
              senderLabel: "display-sender",
              role: "implementer",
              rowKind: "normal",
              tone: "neutral",
              badges: [],
              progress: null,
              validationFailure: null,
              syntheticApproval: null
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(screen.getByText("Summary wins.")).toBeInTheDocument();
    expect(screen.queryByText("Question loses.")).not.toBeInTheDocument();
    expect(screen.queryByText("Message loses.")).not.toBeInTheDocument();
    expect(screen.getByText("Question fallback.")).toBeInTheDocument();
    expect(screen.getByText("Message fallback.")).toBeInTheDocument();
    expect(screen.getByText("decision=approve")).toBeInTheDocument();
    expect(screen.getByText("(no summary payload)")).toBeInTheDocument();
    expect(screen.getByText("Display summary wins.")).toBeInTheDocument();
    expect(screen.queryByText("Payload summary must not render.")).not.toBeInTheDocument();
    expect(screen.queryByText("Payload question must not render.")).not.toBeInTheDocument();
  });

  it("renders sender, role, and blocked state from display fields over protocol conflicts", () => {
    render(
      <BubbleTimeline
        entries={[
          protocolTimelineEntry({
            id: "env-pass-display-blocked",
            type: "PASS",
            sender: "codex",
            recipient: "human",
            payload: {
              summary: "Payload text loses."
            },
            display: {
              title: "Display blocked text.",
              summaryText: "Display blocked text.",
              summarySource: "summary",
              senderLabel: "display-human",
              role: "human",
              rowKind: "blocked",
              tone: "warning",
              badges: [],
              progress: null,
              validationFailure: null,
              syntheticApproval: null
            }
          }),
          protocolTimelineEntry({
            id: "env-human-question-display-normal",
            type: "HUMAN_QUESTION",
            sender: "human",
            recipient: "codex",
            payload: {
              question: "Payload question loses."
            },
            display: {
              title: "Display normal text.",
              summaryText: "Display normal text.",
              summarySource: "summary",
              senderLabel: "display-implementer",
              role: "implementer",
              rowKind: "normal",
              tone: "neutral",
              badges: [],
              progress: null,
              validationFailure: null,
              syntheticApproval: null
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
    expect(within(blockedRow as HTMLElement).queryByText("Payload text loses.")).not.toBeInTheDocument();

    const normalRow = screen.getByText("Display normal text.").closest("div.flex.items-start");
    expect(normalRow).not.toBeNull();
    expect(within(normalRow as HTMLElement).getByText("implementer")).toHaveTextContent(
      /implementer \(display-implementer\)/u
    );
    expect(within(normalRow as HTMLElement).queryByText(/blocked/u)).not.toBeInTheDocument();
    expect(within(normalRow as HTMLElement).queryByText("Payload question loses.")).not.toBeInTheDocument();
  });

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

  it("uses PASS delivery target role instead of agent name for reviewer fix requests", () => {
    render(
      <BubbleTimeline
        entries={[
          timelineEntry({
            id: "env-reviewer-fix-request",
            type: "PASS",
            sender: "codex",
            recipient: "codex",
            payload: {
              summary: "Please fix the reviewer findings.",
              pass_intent: "fix_request",
              metadata: {
                delivery_target_role: "implementer"
              },
              findings: [
                {
                  severity: "P2",
                  title: "Finding title",
                  refs: []
                }
              ]
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact
      />
    );

    const actorLabel = screen.getByText("reviewer", {
      selector: "span.font-medium"
    });

    expect(actorLabel).toHaveTextContent(/reviewer/u);
    expect(actorLabel).toHaveTextContent(/\(codex\)/u);
    expect(
      screen.queryByText("implementer", { selector: "span.font-medium" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
  });

  it("keeps current orchestrator and convergence labels for system-like rows", () => {
    render(
      <BubbleTimeline
        entries={[
          protocolTimelineEntry({
            id: "env-orchestrator-task",
            type: "TASK",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              summary: "Task sent."
            }
          }),
          protocolTimelineEntry({
            id: "env-convergence",
            type: "CONVERGENCE",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Converged."
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const taskRow = screen.getByText("Task sent.").closest("div.flex.items-start");
    expect(taskRow).not.toBeNull();
    expect(within(taskRow as HTMLElement).getByText("orchestrator")).toBeInTheDocument();

    const convergenceRow = screen.getByText("Converged.").closest("div.flex.items-start");
    expect(convergenceRow).not.toBeNull();
    expect(
      within(convergenceRow as HTMLElement).getByText("CONVERGENCE")
    ).toBeInTheDocument();
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

  it("splits meta-review approval from orchestrator gate failure using display descriptors", () => {
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
              message: "Payload text does not contain the legacy gate failure marker.",
              metadata: {
                actor: "meta-reviewer",
                actor_agent: "codex",
                recommendation: "approve"
              }
            },
            display: {
              title:
                "Meta-review approved the current change, but the required approve-gate validation failed.",
              summaryText:
                "Meta-review approved the current change, but the required approve-gate validation failed.",
              summarySource: "message",
              senderLabel: "codex",
              role: "meta_reviewer",
              rowKind: "gate_failure",
              tone: "danger",
              badges: [],
              progress: null,
              validationFailure: {
                summaryText:
                  "Meta-review approved the current change, but the required approve-gate validation failed.",
                tone: "danger"
              },
              syntheticApproval: {
                kind: "meta_review_approval",
                sourceEntryId: "env-gate-failed-rework",
                syntheticEntryId: "env-gate-failed-rework:meta-review-approve",
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
    expect(metaLabel).toHaveTextContent(/\(codex\)/u);
    const metaRow = metaLabel.closest("div.flex.items-start");
    expect(metaRow).not.toBeNull();
    expect(
      within(metaRow as HTMLElement).getByText("Meta-review approved the current change.")
    ).toBeInTheDocument();
    expect(within(metaRow as HTMLElement).getByText("approve")).toBeInTheDocument();
    expect(within(metaRow as HTMLElement).queryByText("rework")).not.toBeInTheDocument();

    const orchestratorLabel = screen.getByText("orchestrator", {
      selector: "span.font-medium"
    });
    expect(orchestratorLabel).toHaveTextContent("orchestrator (gate failed)");
    const orchestratorRow = orchestratorLabel.closest("div.flex.items-start");
    expect(orchestratorRow).not.toBeNull();
    expect(
      within(orchestratorRow as HTMLElement).getByText(
        "Meta-review approved the current change, but the required approve-gate validation failed."
      )
    ).toBeInTheDocument();
    expect(
      within(orchestratorRow as HTMLElement).queryByText(
        "Payload text does not contain the legacy gate failure marker."
      )
    ).not.toBeInTheDocument();
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

  it("deduplicates finding severities and preserves fallback styling for unknown severity tags", () => {
    render(
      <BubbleTimeline
        entries={[
          protocolTimelineEntry({
            id: "env-unknown-severity",
            type: "APPROVAL_DECISION",
            sender: "orchestrator",
            recipient: "codex",
            payload: {
              decision: "rework",
              message: "Apply rework.",
              findings: [
                { title: "blocking", severity: "P1" },
                { title: "duplicate blocking", severity: "P1" },
                { title: "future severity", severity: "PX" as never }
              ]
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    const p1Badges = screen
      .getAllByText("P1")
      .filter((node) => node.className.includes("inline-block"));
    expect(p1Badges).toHaveLength(1);

    const unknownBadge = screen.getByText("PX");
    expect(unknownBadge).toBeInTheDocument();
    expect(unknownBadge.className).toContain("text-slate-400");
  });

  it("renders current meta-review recommendation badge variants", () => {
    render(
      <BubbleTimeline
        entries={[
          protocolTimelineEntry({
            id: "env-recommend-approve",
            type: "APPROVAL_REQUEST",
            payload: {
              summary: "Approve recommendation.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve"
              }
            }
          }),
          protocolTimelineEntry({
            id: "env-recommend-rework",
            type: "APPROVAL_REQUEST",
            payload: {
              summary: "Rework recommendation.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "rework"
              }
            }
          }),
          protocolTimelineEntry({
            id: "env-recommend-inconclusive",
            type: "APPROVAL_REQUEST",
            payload: {
              summary: "Inconclusive recommendation.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "inconclusive"
              }
            }
          })
        ]}
        isLoading={false}
        error={null}
        compact={false}
      />
    );

    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.getByText("rework")).toBeInTheDocument();
    expect(screen.getByText("inconclusive")).toBeInTheDocument();
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

  it("uses explicit meta-review clean-run metadata before the approval streak is complete", () => {
    render(
      <BubbleTimeline
        entries={[
          protocolTimelineEntry({
            id: "env-explicit-clean-runs",
            type: "APPROVAL_REQUEST",
            sender: "orchestrator",
            recipient: "human",
            payload: {
              summary: "Second explicit clean meta-review.",
              metadata: {
                actor: "meta-reviewer",
                latest_recommendation: "approve",
                consecutive_clean_runs: 2
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

    expect(screen.getByText("clean 2")).toBeInTheDocument();
    expect(screen.queryByText("approve")).not.toBeInTheDocument();
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
