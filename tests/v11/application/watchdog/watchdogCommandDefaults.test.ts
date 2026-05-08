import { describe, expect, it, vi } from "vitest";
import {
  runBubbleWatchdogV11,
  type BubbleWatchdogV11Dependencies
} from "../../../../src/v11/application/watchdog/emitWatchdogV11.js";
import { watchdogCommandDefaults } from "../../../../src/v11/defaults/watchdog/watchdogCommandDefaults.js";
import { watchdogPendingReworkDefaults } from "../../../../src/v11/defaults/watchdog/watchdogPendingReworkDefaults.js";
import type { WriteWatchdogPaneActivityPort } from "../../../../src/v11/ports/watchdogPaneActivity.js";

describe("watchdog command defaults", () => {
  it("exports runtime session and tmux defaults required for pane activity sampling", () => {
    expect(typeof watchdogCommandDefaults.readRuntimeSessionsRegistry).toBe("function");
    expect(typeof watchdogCommandDefaults.runTmux).toBe("function");
  });

  it("uses composed runtime session and tmux dependencies supplied by the composition root", async () => {
    const writeWatchdogPaneActivity = vi.fn<WriteWatchdogPaneActivityPort>(
      async () => "/tmp/watchdog-pane.json"
    );
    const appendWatchdogTrace = vi.fn(async () => "/tmp/watchdog-trace.jsonl");
    const readRuntimeSessionsRegistry = vi.fn(async () => ({
      b_watchdog_defaults_01: {
        bubbleId: "b_watchdog_defaults_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-watchdog-defaults",
        updatedAt: "2026-04-10T22:00:00.000Z"
      }
    }));
    const runTmux = vi.fn(async () => ({
      stdout: "reviewer pane output\n",
      stderr: "",
      exitCode: 0
    }));

    const result = await runBubbleWatchdogV11({
      bubbleId: "b_watchdog_defaults_01",
      repoPath: "/tmp/repo",
      now: new Date("2026-04-10T22:00:00.000Z")
    }, {
      ...watchdogCommandDefaults,
      ...watchdogPendingReworkDefaults,
      appendProtocolEnvelope: (async () => ({
        id: "msg_unused"
      })) as unknown as BubbleWatchdogV11Dependencies["appendProtocolEnvelope"],
      appendWatchdogTrace,
      emitBubbleNotification: async () => ({
        kind: "waiting-human" as const,
        attempted: false,
        delivered: false,
        status: "rejected",
        soundPath: null,
        reason: "disabled" as const
      }),
      emitDeliveryNotificationAck: async () => ({
        status: "accepted",
        message: "ok"
      }),
      retryStuckAgentInput: (async () => ({
        retried: false,
        reason: "not_stuck"
      })) as BubbleWatchdogV11Dependencies["retryStuckAgentInput"],
      readStateSnapshot: (async () => ({
        fingerprint: "fp_state",
        state: {
          bubble_id: "b_watchdog_defaults_01",
          state: "RUNNING",
          round: 1,
          active_agent: "claude",
          active_role: "reviewer",
          active_since: "2026-04-10T21:59:00.000Z",
          last_command_at: "2026-04-10T21:59:00.000Z",
          execution_context: {
            active_role: "reviewer",
            awaited_output_type: "pass_result",
            handoff_id: "reviewer:b_watchdog_defaults_01:round:1:attempt:1",
            round: 1,
            started_at: "2026-04-10T21:59:00.000Z",
            deadline_at: "2026-04-10T22:29:00.000Z",
            attempt: 1
          },
          meta_review: null,
          round_role_history: []
        }
      })) as unknown as BubbleWatchdogV11Dependencies["readStateSnapshot"],
      readRuntimeSessionsRegistry,
      readWatchdogPaneActivity: async () => ({
        status: "missing" as const
      }),
      resolveBubbleById: (async () => ({
        bubbleId: "b_watchdog_defaults_01",
        repoPath: "/tmp/repo",
        bubbleConfig: {
          id: "b_watchdog_defaults_01",
          repo_path: "/tmp/repo",
          base_branch: "main",
          bubble_branch: "bubble/watchdog-defaults",
          worktree_path: "/tmp/worktree",
          runtime_dir: "/tmp/runtime",
          task: "Watchdog defaults",
          created_at: "2026-04-10T21:00:00.000Z",
          updated_at: "2026-04-10T21:00:00.000Z",
          status: "running",
          bootstrap_command: null,
          remote: null,
          meta_review: null,
          max_review_rounds: 3,
          watchdog_timeout_minutes: 30,
          agents: {
            implementer: "codex",
            reviewer: "claude"
          }
        },
        bubblePaths: {
          runtimeDir: "/tmp/runtime",
          sessionsPath: "/tmp/runtime/sessions.json",
          statePath: "/tmp/runtime/state.json"
        }
      })) as unknown as BubbleWatchdogV11Dependencies["resolveBubbleById"],
      runTmux,
      writeStateSnapshot: (async () => ({
        fingerprint: "fp_next",
        state: {
          bubble_id: "b_watchdog_defaults_01",
          state: "RUNNING",
          round: 1,
          active_agent: "claude",
          active_role: "reviewer",
          active_since: "2026-04-10T21:59:00.000Z",
          last_command_at: "2026-04-10T21:59:00.000Z",
          execution_context: null,
          meta_review: null,
          round_role_history: []
        }
      })) as unknown as BubbleWatchdogV11Dependencies["writeStateSnapshot"],
      writeWatchdogPaneActivity,
      ensureBubbleInstanceIdForMutation: async () => ({
        bubbleInstanceId: "bi_stub",
        bubbleConfig: {
          id: "b_watchdog_defaults_01"
        } as never,
        backfilled: false
      }),
      resolveDeliveryMessageRef: () => ""
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(readRuntimeSessionsRegistry).toHaveBeenCalledTimes(1);
    expect(runTmux).toHaveBeenCalledWith(
      ["capture-pane", "-pt", "pf-watchdog-defaults:0.2", "-S", "-20"],
      { allowFailure: true }
    );
    expect(writeWatchdogPaneActivity).toHaveBeenCalledTimes(1);
    const writeWatchdogPaneActivityCall =
      writeWatchdogPaneActivity.mock.calls[0];
    expect(writeWatchdogPaneActivityCall).toBeDefined();
    if (!writeWatchdogPaneActivityCall) {
      throw new Error("expected writeWatchdogPaneActivity to be called once");
    }
    const [writeWatchdogPaneActivityInput] = writeWatchdogPaneActivityCall;
    expect(writeWatchdogPaneActivityInput.runtimeDir).toBe("/tmp/runtime");
    expect(writeWatchdogPaneActivityInput.bubbleId).toBe(
      "b_watchdog_defaults_01"
    );
    expect(writeWatchdogPaneActivityInput.record.bubble_id).toBe(
      "b_watchdog_defaults_01"
    );
    expect(writeWatchdogPaneActivityInput.record.session_name).toBe(
      "pf-watchdog-defaults"
    );
    expect(writeWatchdogPaneActivityInput.record.target_pane).toBe(
      "pf-watchdog-defaults:0.2"
    );
    expect(writeWatchdogPaneActivityInput.record.last_sample_status).toBe(
      "sampled"
    );
    expect(appendWatchdogTrace).toHaveBeenCalledTimes(1);
  });
});
