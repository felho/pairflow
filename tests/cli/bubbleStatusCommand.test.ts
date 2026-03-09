import { describe, expect, it } from "vitest";

import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusTable,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "../../src/cli/commands/bubble/status.js";
import type { BubbleStatusView } from "../../src/core/bubble/statusBubble.js";

describe("parseBubbleStatusCommandOptions", () => {
  it("parses required and optional flags", () => {
    const parsed = parseBubbleStatusCommandOptions([
      "--id",
      "b_status_01",
      "--repo",
      "/tmp/repo",
      "--json",
      "--table"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble status options");
    }

    expect(parsed.id).toBe("b_status_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.json).toBe(true);
    expect(parsed.table).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleStatusCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleStatusHelpText()).toContain("pairflow bubble status");
  });

  it("requires --id", () => {
    expect(() => parseBubbleStatusCommandOptions([])).toThrow(/--id/u);
  });
});

describe("runBubbleStatusCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleStatusCommand(["--help"]);
    expect(result).toBeNull();
  });
});

describe("renderBubbleStatusText", () => {
  function createStatusView(
    partial: Partial<BubbleStatusView>
  ): BubbleStatusView {
    return {
      bubbleId: "b_status_render_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "RUNNING",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-22T12:00:00.000Z",
      lastCommandAt: "2026-02-22T12:05:00.000Z",
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 5,
        referenceTimestamp: "2026-02-22T12:05:00.000Z",
        deadlineTimestamp: "2026-02-22T12:10:00.000Z",
        remainingSeconds: 90,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 3,
        lastMessageType: "PASS",
        lastMessageTs: "2026-02-22T12:05:00.000Z",
        lastMessageId: "msg_20260222_003"
      },
      metaReview: {
        actor: "meta-reviewer",
        latestRecommendation: "inconclusive",
        latestStatus: "inconclusive",
        latestSummary: "No deterministic recommendation.",
        latestReportRef: "artifacts/meta-review-last.md",
        latestUpdatedAt: "2026-02-22T12:04:59.000Z"
      },
      accuracy_critical: false,
      last_review_verification: "missing",
      failing_gates: [],
      spec_lock_state: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      round_gate_state: {
        applies: false,
        violated: false,
        round: 2
      },
      ...partial
    };
  }

  it("includes escalation line when watchdog is expired", () => {
    const rendered = renderBubbleStatusText(
      createStatusView({
        watchdog: {
          monitored: true,
          monitoredAgent: "codex",
          timeoutMinutes: 5,
          referenceTimestamp: "2026-02-22T12:05:00.000Z",
          deadlineTimestamp: "2026-02-22T12:10:00.000Z",
          remainingSeconds: 0,
          expired: true
        }
      })
    );

    expect(rendered).toContain("Escalation: watchdog timeout exceeded");
    expect(rendered).toContain("active agent codex");
  });

  it("omits escalation line when watchdog has not expired", () => {
    const rendered = renderBubbleStatusText(createStatusView({}));
    expect(rendered).not.toContain("Escalation:");
  });

  it("renders non-default gate diagnostics in status text", () => {
    const rendered = renderBubbleStatusText(
      createStatusView({
        failing_gates: [
          {
            gate_id: "review_round.policy",
            reason_code: "ROUND_GATE_WARNING",
            message: "Round gate violated",
            priority: "P2",
            timing: "later-hardening",
            layer: "L1",
            signal_level: "warning"
          }
        ],
        spec_lock_state: {
          state: "LOCKED",
          open_blocker_count: 2,
          open_required_now_count: 3
        },
        round_gate_state: {
          applies: true,
          violated: true,
          round: 4,
          reason_code: "ROUND_GATE_WARNING"
        }
      })
    );

    expect(rendered).toContain("Failing gates: ROUND_GATE_WARNING");
    expect(rendered).toContain("Spec lock: LOCKED (blockers=2, required_now=3)");
    expect(rendered).toContain("Round gate: applies=yes violated=yes round=4 reason=ROUND_GATE_WARNING");
  });

  it("shows review verification as n/a when accuracy critical is disabled", () => {
    const rendered = renderBubbleStatusText(createStatusView({}));
    expect(rendered).toContain("Last review verification: n/a");
  });
});

describe("renderBubbleStatusTable", () => {
  function createStatusView(
    partial: Partial<BubbleStatusView>
  ): BubbleStatusView {
    return {
      bubbleId: "b_status_render_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "RUNNING",
      round: 5,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-03-08T21:29:15.948Z",
      lastCommandAt: "2026-03-08T21:29:15.948Z",
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 20,
        referenceTimestamp: "2026-03-08T21:29:15.948Z",
        deadlineTimestamp: "2026-03-08T21:49:15.948Z",
        remainingSeconds: 1075,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 13,
        lastMessageType: "APPROVAL_DECISION",
        lastMessageTs: "2026-03-08T21:29:15.948Z",
        lastMessageId: "msg_20260308_013"
      },
      metaReview: {
        actor: "meta-reviewer",
        latestRecommendation: "approve",
        latestStatus: "success",
        latestSummary: "Autonomous recommendation approve.",
        latestReportRef: "artifacts/meta-review-last.md",
        latestUpdatedAt: "2026-03-08T21:29:00.000Z"
      },
      accuracy_critical: false,
      last_review_verification: "missing",
      failing_gates: [],
      spec_lock_state: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      round_gate_state: {
        applies: false,
        violated: false,
        round: 5
      },
      ...partial
    };
  }

  it("renders compact grouped sections", () => {
    const rendered = renderBubbleStatusTable(createStatusView({}));

    expect(rendered).toContain("| Bubble");
    expect(rendered).toContain("| Lifecycle");
    expect(rendered).toContain("| Runtime");
    expect(rendered).toContain("| Inbox");
    expect(rendered).toContain("| Review");
    expect(rendered).toContain("| Gates");
    expect(rendered).toContain("| Transcript");
    expect(rendered).toContain("verification=n/a");
    expect(rendered).not.toContain("Failing gates:");
    expect(rendered).not.toContain("Spec lock:");
    expect(rendered).not.toContain("Round gate:");
  });

  it("adds escalation section when watchdog is expired", () => {
    const rendered = renderBubbleStatusTable(
      createStatusView({
        watchdog: {
          monitored: true,
          monitoredAgent: "codex",
          timeoutMinutes: 20,
          referenceTimestamp: "2026-03-08T21:29:15.948Z",
          deadlineTimestamp: "2026-03-08T21:49:15.948Z",
          remainingSeconds: 0,
          expired: true
        }
      })
    );

    expect(rendered).toContain("| Escalation");
    expect(rendered).toContain("timeout for codex");
  });
});
