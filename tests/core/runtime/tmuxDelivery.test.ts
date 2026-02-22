import { describe, expect, it } from "vitest";

import { emitTmuxDeliveryNotification } from "../../../src/core/runtime/tmuxDelivery.js";
import type { RuntimeSessionsRegistry } from "../../../src/core/runtime/sessionsRegistry.js";
import type { TmuxRunResult, TmuxRunner } from "../../../src/core/runtime/tmuxManager.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";

const baseConfig: BubbleConfig = {
  id: "b_delivery_01",
  repo_path: "/tmp/repo",
  base_branch: "main",
  bubble_branch: "pf/b_delivery_01",
  work_mode: "worktree",
  quality_mode: "strict",
  watchdog_timeout_minutes: 5,
  max_rounds: 8,
  commit_requires_approval: true,
  agents: {
    implementer: "codex",
    reviewer: "claude"
  },
  commands: {
    test: "pnpm test",
    typecheck: "pnpm typecheck"
  },
  notifications: {
    enabled: true
  }
};

function createEnvelope(overrides: Partial<ProtocolEnvelope> = {}): ProtocolEnvelope {
  return {
    id: "msg_20260222_101",
    ts: "2026-02-22T12:00:00.000Z",
    bubble_id: "b_delivery_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: "handoff"
    },
    refs: ["artifact://handoff.md"],
    ...overrides
  };
}

function createRegistry(): RuntimeSessionsRegistry {
  return {
    b_delivery_01: {
      bubbleId: "b_delivery_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      tmuxSessionName: "pf-b_delivery_01",
      updatedAt: "2026-02-22T12:00:00.000Z"
    }
  };
}

describe("emitTmuxDeliveryNotification", () => {
  it("routes PASS delivery to recipient agent pane", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.sessionName).toBe("pf-b_delivery_01");
    expect(result.targetPaneIndex).toBe(2);
    expect(calls[0]).toEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "-l",
      expect.stringContaining("[pairflow] r1 PASS codex->claude artifact://handoff.md")
    ]);
    expect(calls[1]).toEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "Enter"
    ]);
  });

  it("routes human recipient notifications to status pane", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "claude",
        recipient: "human",
        type: "HUMAN_QUESTION"
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(0);
    expect(calls[0]?.[2]).toBe("pf-b_delivery_01:0.0");
  });

  it("returns no_runtime_session when registry has no entry", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toEqual({
      delivered: false,
      message: "[pairflow] r1 PASS codex->claude artifact://handoff.md",
      reason: "no_runtime_session"
    });
    expect(calls).toHaveLength(0);
  });

  it("returns registry_read_failed when session registry load fails", async () => {
    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      readSessionsRegistry: async () => Promise.reject(new Error("invalid json"))
    });

    expect(result).toEqual({
      delivered: false,
      message: "[pairflow] r1 PASS codex->claude artifact://handoff.md",
      reason: "registry_read_failed"
    });
  });

  it("returns tmux_send_failed when tmux command fails", async () => {
    const runner: TmuxRunner = () => Promise.reject(new Error("tmux unavailable"));

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result).toEqual({
      delivered: false,
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      message: "[pairflow] r1 PASS codex->claude artifact://handoff.md",
      reason: "tmux_send_failed"
    });
  });
});
