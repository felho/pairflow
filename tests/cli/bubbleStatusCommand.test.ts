import { describe, expect, it } from "vitest";

import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusTable,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "../../src/cli/commands/bubble/status.js";
import type { BubbleStatusV11View as BubbleStatusView } from "../../src/v11/application/status/emitStatusV11.js";

function formatLocalClock(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const second = parts.find((part) => part.type === "second")?.value;
  if (hour === undefined || minute === undefined || second === undefined) {
    throw new Error(`Failed to format local clock timestamp: ${value}`);
  }
  return `${hour}:${minute}:${second}`;
}

function formatLocalTableTimestamp(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset"
  }).formatToParts(new Date(value));
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const second = parts.find((part) => part.type === "second")?.value;
  const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value;
  if (
    month === undefined
    || day === undefined
    || hour === undefined
    || minute === undefined
    || second === undefined
    || timeZoneName === undefined
  ) {
    throw new Error(`Failed to format local table timestamp: ${value}`);
  }
  return `${month}-${day}T${hour}:${minute}:${second} ${timeZoneName}`;
}

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
      bubbleStartedAt: "2026-02-22T11:58:00.000Z",
      state: "RUNNING",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-22T12:00:00.000Z",
      lastCommandAt: "2026-02-22T12:05:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-02-22T12:04:00.000Z",
        sampledAt: "2026-02-22T12:05:30.000Z",
        sinceLastChangedSeconds: 120,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_render_01",
        targetPane: "pf-b_status_render_01:0.1"
      },
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
      "Meta-review: authority=active route=-"
    );
    expect(rendered).toContain("Bubble start: 2026-02-22T11:58:00.000Z");
    expect(rendered).toContain(
      `Pane activity: last=${formatLocalClock("2026-02-22T12:04:00.000Z")} age=120s`
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
      "Meta-review: authority=inactive route=human_gate_dispatch_failed"
    );
    expect(rendered).toContain("reason=META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED");
    expect(rendered).toContain("message=pane delivery not confirmed");
  });

  it("renders routed inconclusive review as success in text mode", () => {
    const rendered = renderBubbleStatusText(
      createStatusView({
        state: "READY_FOR_HUMAN_APPROVAL",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        executionContext: null,
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
          latestRoute: "human_gate_inconclusive",
          latestRouteReasonCode: null,
          latestRouteObservedAt: "2026-02-22T12:05:10.000Z",
          runtimeDelivery: null
        }
      })
    );

    expect(rendered).toContain(
      "Meta-review: authority=inactive route=human_gate_inconclusive"
    );
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
      bubbleStartedAt: "2026-03-08T21:20:00.000Z",
      state: "RUNNING",
      round: 5,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-03-08T21:29:15.948Z",
      lastCommandAt: "2026-03-08T21:29:15.948Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-03-08T21:25:00.000Z",
        sampledAt: "2026-03-08T21:28:45.000Z",
        sinceLastChangedSeconds: 255,
        sinceSampledSeconds: 30,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b_status_render_01",
        targetPane: "pf-b_status_render_01:0.1"
      },
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
    expect(rendered).toContain(
      `state: valid | cli path: worktree_local | start: ${formatLocalClock("2026-03-08T21:20:00.000Z")}`
    );
    expect(rendered).not.toContain("b_status_render_01 | state:");
    expect(rendered).toContain("| Lifecycle");
    expect(rendered).toContain(
      `since ${formatLocalClock("2026-03-08T21:29:15.948Z")}`
    );
    expect(rendered).not.toContain("| State validation");
    expect(rendered).not.toContain("| Command path");
    expect(rendered).toContain("| Runtime");
    expect(rendered).toContain("| Inbox");
    expect(rendered).toContain("| Meta-review");
    expect(rendered).toContain("authority=inactive");
    expect(rendered).toContain("route=- | runtime_delivery=-");
    expect(rendered).toContain("| Review");
    expect(rendered).toContain("| Gates");
    expect(rendered).toContain("| Transcript");
    expect(rendered).toContain("verification=n/a");
    expect(rendered).toContain("runtime_delivery=-");
    expect(rendered).toContain(
      `last ${formatLocalClock("2026-03-08T21:25:00.000Z")}`
    );
    expect(rendered).toContain("age=255s");
    expect(rendered).not.toContain("sample=");
    expect(rendered).not.toContain("exp=");
    expect(rendered).not.toContain("Failing gates:");
    expect(rendered).not.toContain("Spec lock:");
    expect(rendered).not.toContain("Round gate:");
    expect(rendered).toContain(
      `last=APPROVAL_DECISION @ ${formatLocalClock("2026-03-08T21:29:15.948Z")}`
    );
    expect(rendered).not.toContain("2026-03-08T21:29:15.948Z");

    const inboxIndex = rendered.indexOf("| Inbox");
    const metaReviewIndex = rendered.indexOf("| Meta-review");
    expect(metaReviewIndex).toBeGreaterThan(inboxIndex);
  });

  it("renders routed inconclusive review as success in table mode", () => {
    const rendered = renderBubbleStatusTable(
      createStatusView({
        state: "READY_FOR_HUMAN_APPROVAL",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        executionContext: null,
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
          latestRoute: "human_gate_inconclusive",
          latestRouteReasonCode: null,
          latestRouteObservedAt: "2026-03-08T21:29:00.000Z",
          runtimeDelivery: null
        }
      })
    );

    expect(rendered).toContain("authority=inactive");
    expect(rendered).toContain("route=human_gate_inconclusive | runtime_delivery=-");
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

  it("renders inactive runtime summary when watchdog monitoring is off", () => {
    const rendered = renderBubbleStatusTable(
      createStatusView({
        state: "READY_FOR_HUMAN_APPROVAL",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        watchdog: {
          monitored: false,
          monitoredAgent: null,
          timeoutMinutes: 20,
          referenceTimestamp: "2026-03-08T21:29:15.948Z",
          deadlineTimestamp: null,
          remainingSeconds: null,
          expired: false
        }
      })
    );

    expect(rendered).toContain("| Runtime");
    expect(rendered).toContain("inactive | last observed");
    expect(rendered).not.toContain("age=255s");
    expect(rendered).toContain("watchdog off 20m rem=-");
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

    expect(rendered).toContain(
      "cli path: PAIRFLOW_COMMAND_PATH_STALE"
    );
  });

  it("renders runtime delivery diagnostics in table mode", () => {
    const rendered = renderBubbleStatusTable(
      createStatusView({
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
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
    expect(rendered).toContain("authority=inactive");
    expect(rendered).toContain(
      "route=human_gate_dispatch_failed | runtime_delivery=failed/META_REVIEW_REQUEST_DELIVERY_FAILED"
    );
    expect(rendered).toContain(
      formatLocalTableTimestamp("2026-03-08T21:29:10.000Z")
    );
  });

  it("clips rendered table lines to the provided width", () => {
    const rendered = renderBubbleStatusTable(createStatusView({}), {
      maxWidth: 48
    });

    const lines = rendered.split("\n");
    expect(lines.every((line) => line.length <= 48)).toBe(true);
    expect(rendered).toContain("| Bubble");
    expect(rendered).not.toContain(
      `${formatLocalClock("2026-03-08T21:20:00.000Z")} |`
    );
  });

  it("pads rendered table lines to the provided width", () => {
    const rendered = renderBubbleStatusTable(createStatusView({}), {
      maxWidth: 140
    });

    const lines = rendered.split("\n");
    expect(lines.every((line) => line.length === 140)).toBe(true);
  });
});
