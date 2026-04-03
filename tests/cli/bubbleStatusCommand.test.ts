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
      executionContext: {
        activeRole: "implementer",
        awaitedOutputType: "pass_result",
        handoffId: "implementer:b_status_render_01:round:2:attempt:1",
        round: 2,
        startedAt: "2026-02-22T12:00:00.000Z",
        deadlineAt: "2026-02-22T12:10:00.000Z",
        attempt: 1
      },
      stateValidation: null,
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
        authorityActive: true,
        latestRecommendation: "inconclusive",
        latestStatus: "inconclusive",
        latestSummary: "No deterministic recommendation.",
        latestReportRef: "artifacts/meta-review-last.json",
        latestUpdatedAt: "2026-02-22T12:04:59.000Z",
        latestRoute: null,
        latestRouteReasonCode: null,
        latestRouteObservedAt: null,
        runtimeDelivery: null
      },
      commandPath: {
        status: "worktree_local",
        profile: "self_host",
        localEntrypoint: "/tmp/worktree/dist/cli/index.js",
        activeEntrypoint: "/tmp/worktree/dist/cli/index.js",
        message:
          "worktree-local Pairflow entrypoint active (/tmp/worktree/dist/cli/index.js)",
        pinnedCommand: "node '/tmp/worktree/dist/cli/index.js'"
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
    expect(rendered).toContain(
      "Command path: worktree_local profile=self_host active=/tmp/worktree/dist/cli/index.js expected=/tmp/worktree/dist/cli/index.js"
    );
    expect(rendered).toContain(
      "Execution context: role=implementer awaited=pass_result handoff=implementer:b_status_render_01:round:2:attempt:1 round=2 attempt=1"
    );
    expect(rendered).toContain(
      "pinned=node '/tmp/worktree/dist/cli/index.js'"
    );
    expect(rendered).toContain(
      "Meta-review: status=inconclusive recommendation=inconclusive route=-"
    );
    expect(rendered).toContain("Last review verification: n/a");
  });

  it("surfaces stale command-path diagnostics in text mode", () => {
    const rendered = renderBubbleStatusText(
      createStatusView({
        commandPath: {
          status: "stale",
          reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
          profile: "self_host",
          localEntrypoint: "/tmp/worktree/dist/cli/index.js",
          activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
          message:
            "PAIRFLOW_COMMAND_PATH_STALE: active Pairflow entrypoint /usr/local/lib/node_modules/pairflow/dist/cli/index.js does not match worktree-local /tmp/worktree/dist/cli/index.js.",
          pinnedCommand: "node '/tmp/worktree/dist/cli/index.js'"
        }
      })
    );

    expect(rendered).toContain(
      "Command path: stale profile=self_host reason=PAIRFLOW_COMMAND_PATH_STALE"
    );
  });

  it("renders runtime delivery diagnostics in text mode", () => {
    const rendered = renderBubbleStatusText(
      createStatusView({
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
          latestRecommendation: "inconclusive",
          latestStatus: "inconclusive",
          latestSummary: "No deterministic recommendation.",
          latestReportRef: "artifacts/meta-review-last.json",
          latestUpdatedAt: "2026-02-22T12:04:59.000Z",
          latestRoute: "human_gate_dispatch_failed",
          latestRouteReasonCode: null,
          latestRouteObservedAt: "2026-02-22T12:05:10.000Z",
          runtimeDelivery: {
            status: "uncertain",
            reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message: "pane delivery not confirmed",
            observedAt: "2026-02-22T12:05:30.000Z",
            observedForHandoffId: "meta_review:b_status_render_01:round:2:attempt:1",
            observedForRound: 2
          }
        }
      })
    );

    expect(rendered).toContain("Meta-review runtime delivery: uncertain");
    expect(rendered).toContain(
      "Meta-review: status=inconclusive recommendation=inconclusive route=human_gate_dispatch_failed"
    );
    expect(rendered).toContain("reason=META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED");
    expect(rendered).toContain("message=pane delivery not confirmed");
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
      executionContext: {
        activeRole: "implementer",
        awaitedOutputType: "pass_result",
        handoffId: "implementer:b_status_render_01:round:5:attempt:1",
        round: 5,
        startedAt: "2026-03-08T21:29:15.948Z",
        deadlineAt: "2026-03-08T21:49:15.948Z",
        attempt: 1
      },
      stateValidation: null,
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
        authorityActive: false,
        latestRecommendation: "approve",
        latestStatus: "success",
        latestSummary: "Autonomous recommendation approve.",
        latestReportRef: "artifacts/meta-review-last.json",
        latestUpdatedAt: "2026-03-08T21:29:00.000Z",
        latestRoute: null,
        latestRouteReasonCode: null,
        latestRouteObservedAt: null,
        runtimeDelivery: null
      },
      commandPath: {
        status: "worktree_local",
        profile: "self_host",
        localEntrypoint: "/tmp/worktree/dist/cli/index.js",
        activeEntrypoint: "/tmp/worktree/dist/cli/index.js",
        message:
          "worktree-local Pairflow entrypoint active (/tmp/worktree/dist/cli/index.js)",
        pinnedCommand: "node '/tmp/worktree/dist/cli/index.js'"
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
    expect(rendered).toContain("| Command path");
    expect(rendered).toContain("| Inbox");
    expect(rendered).toContain("| Review");
    expect(rendered).toContain("| Gates");
    expect(rendered).toContain("| Transcript");
    expect(rendered).toContain("verification=n/a");
    expect(rendered).not.toContain("Failing gates:");
    expect(rendered).not.toContain("Spec lock:");
    expect(rendered).not.toContain("Round gate:");
    expect(rendered).toContain("03-08T21:29:15Z");
    expect(rendered).not.toContain("2026-03-08T21:29:15.948Z");
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

  it("renders stale command-path warning in table mode", () => {
    const rendered = renderBubbleStatusTable(
      createStatusView({
        commandPath: {
          status: "stale",
          reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
          profile: "self_host",
          localEntrypoint: "/tmp/worktree/dist/cli/index.js",
          activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
          message:
            "PAIRFLOW_COMMAND_PATH_STALE: active Pairflow entrypoint /usr/local/lib/node_modules/pairflow/dist/cli/index.js does not match worktree-local /tmp/worktree/dist/cli/index.js.",
          pinnedCommand: "node '/tmp/worktree/dist/cli/index.js'"
        }
      })
    );

    expect(rendered).toContain("PAIRFLOW_COMMAND_PATH_STALE");
  });

  it("renders runtime delivery diagnostics in table mode", () => {
    const rendered = renderBubbleStatusTable(
      createStatusView({
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
          latestRecommendation: "approve",
          latestStatus: "success",
          latestSummary: "Autonomous recommendation approve.",
          latestReportRef: "artifacts/meta-review-last.json",
          latestUpdatedAt: "2026-03-08T21:29:00.000Z",
          latestRoute: "human_gate_dispatch_failed",
          latestRouteReasonCode: null,
          latestRouteObservedAt: "2026-03-08T21:29:05.000Z",
          runtimeDelivery: {
            status: "failed",
            reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
            message: "tmux send failed",
            observedAt: "2026-03-08T21:29:10.000Z",
            observedForHandoffId: "meta_review:b_status_render_01:round:5:attempt:1",
            observedForRound: 5
          }
        }
      })
    );

    expect(rendered).toContain("| Meta-review");
    expect(rendered).toContain("route=human_gate_dispatch_failed");
    expect(rendered).toContain("runtime_delivery=failed/META_REVIEW_REQUEST_DELIVERY_FAILED");
  });
});
