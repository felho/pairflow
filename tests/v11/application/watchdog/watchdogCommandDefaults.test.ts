import { afterEach, describe, expect, it, vi } from "vitest";
import type { WriteWatchdogPaneActivityPort } from "../../../../src/v11/shared/ports/watchdogPaneActivity.js";

describe("watchdog command defaults", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../../../src/v11/application/watchdog/watchdogDependencyDefaults.js");
  });

  it("exports runtime session and tmux defaults required for pane activity sampling", async () => {
    const { watchdogCommandDefaults } = await import(
      "../../../../src/v11/defaults/watchdog/watchdogCommandDefaults.js"
    );

    expect(typeof watchdogCommandDefaults.readRuntimeSessionsRegistry).toBe("function");
    expect(typeof watchdogCommandDefaults.runTmux).toBe("function");
  });

  it("falls back to default runtime session and tmux dependencies when callers omit them", async () => {
    const writeWatchdogPaneActivity = vi.fn<WriteWatchdogPaneActivityPort>(
      async () => "/tmp/watchdog-pane.json"
    );
    const appendWatchdogTrace = vi.fn(async () => undefined);
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

    vi.doMock(
      "../../../../src/v11/application/watchdog/watchdogDependencyDefaults.js",
      () => ({
        loadWatchdogCommandDefaults: async () => ({
          appendProtocolEnvelope: async () => ({
            id: "msg_unused"
          }),
          appendWatchdogTrace,
          emitBubbleNotification: async () => ({
            kind: "waiting-human" as const,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled" as const
          }),
          emitDeliveryNotificationAck: async () => ({
            delivered: true,
            message: "ok"
          }),
          retryStuckAgentInput: async () => false,
          readStateSnapshot: async () => ({
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
              meta_review: null
            }
          }),
          readRuntimeSessionsRegistry,
          readWatchdogPaneActivity: async () => ({
            status: "missing" as const
          }),
          resolveBubbleById: async () => ({
            bubbleId: "b_watchdog_defaults_01",
            repoPath: "/tmp/repo",
            bubbleConfig: {
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
          }),
          runTmux,
          writeStateSnapshot: async () => ({
            fingerprint: "fp_next",
            state: {
              bubble_id: "b_watchdog_defaults_01",
              state: "RUNNING"
            }
          }),
          writeWatchdogPaneActivity
        }),
        loadWatchdogPendingReworkDefaults: async () => ({
          ensureBubbleInstanceIdForMutation: async () => "bi_stub",
          resolveDeliveryMessageRef: async () => null
        })
      })
    );

    const { runBubbleWatchdogV11 } = await import(
      "../../../../src/v11/application/watchdog/emitWatchdogV11.js"
    );

    const result = await runBubbleWatchdogV11({
      bubbleId: "b_watchdog_defaults_01",
      repoPath: "/tmp/repo",
      now: new Date("2026-04-10T22:00:00.000Z")
    });

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(readRuntimeSessionsRegistry).toHaveBeenCalledTimes(1);
    expect(runTmux).toHaveBeenCalledWith(
      ["capture-pane", "-pt", "pf-watchdog-defaults:0.2"],
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
