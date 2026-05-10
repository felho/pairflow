import { describe, expect, it, vi } from "vitest";

import {
  restartBubble,
  RestartBubbleError
} from "../../../src/v11/application/restart/restartCommandApi.js";
import type { ResolvedBubbleById } from "../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import type { StartBubbleResult } from "../../../src/v11/application/start/startCommandContract.js";
import type { RestartBubbleDependencies } from "../../../src/v11/application/restart/restartCommandContract.js";

function buildRestartBubbleDependencies(
  overrides: RestartBubbleDependencies
): RestartBubbleDependencies {
  return {
    resolveBubbleById: async () => {
      throw new Error("resolveBubbleById test dependency not provided.");
    },
    readRemotePointer: async () => null,
    terminateBubbleTmuxSession: async () => ({
      sessionName: "pf-test",
      existed: false
    }),
    removeRuntimeSession: async () => false,
    persistPassValidationRecoveryMarker: async () => ({
      persisted_targets: [],
      warnings: []
    }),
    startBubble: async () => {
      throw new Error("startBubble test dependency not provided.");
    },
    ...overrides
  };
}

describe("restartBubble", () => {
  it("terminates previous runtime and starts bubble from resolved repo context", async () => {
    const now = new Date("2026-03-16T10:00:00.000Z");
    const callOrder: string[] = [];
    const resolved = {
      bubbleId: "b_restart_01",
      repoPath: "/tmp/repo-real",
      bubbleConfig: {
        id: "b_restart_01"
      },
      bubblePaths: {
        sessionsPath: "/tmp/repo-real/.pairflow/runtime/sessions.json",
        remotePointerPath: "/tmp/repo-real/.pairflow/bubbles/b_restart_01/remote.json"
      }
    } as unknown as ResolvedBubbleById;

    const resolveBubbleById = vi.fn(() => {
      callOrder.push("resolve");
      return Promise.resolve(resolved);
    });
    const terminateBubbleTmuxSession = vi.fn(() => {
      callOrder.push("terminate");
      return Promise.resolve({
        sessionName: "pf-b_restart_01",
        existed: true
      });
    });
    const readRemotePointer = vi.fn(async () => null);
    const removeRuntimeSession = vi.fn(() => {
      callOrder.push("remove");
      return Promise.resolve(true);
    });
    const startBubble = vi.fn(() => {
      callOrder.push("start");
      return Promise.resolve({
        bubbleId: "b_restart_01",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_01",
        worktreePath: "/tmp/repo-real/.pairflow/worktrees/b_restart_01"
      } as unknown as StartBubbleResult);
    });

    const result = await restartBubble(
      {
        bubbleId: "b_restart_01",
        repoPath: "/tmp/repo-symlink",
        cwd: "/tmp",
        now
      },
      buildRestartBubbleDependencies({
        resolveBubbleById,
        readRemotePointer,
        terminateBubbleTmuxSession,
        removeRuntimeSession,
        startBubble
      })
    );

    expect(resolveBubbleById).toHaveBeenCalledWith({
      bubbleId: "b_restart_01",
      repoPath: "/tmp/repo-symlink",
      cwd: "/tmp"
    });
    expect(terminateBubbleTmuxSession).toHaveBeenCalledWith({
      bubbleId: "b_restart_01"
    });
    expect(readRemotePointer).toHaveBeenCalledWith(
      "/tmp/repo-real/.pairflow/bubbles/b_restart_01/remote.json"
    );
    expect(removeRuntimeSession).toHaveBeenCalledWith({
      sessionsPath: "/tmp/repo-real/.pairflow/runtime/sessions.json",
      bubbleId: "b_restart_01"
    });
    expect(startBubble).toHaveBeenCalledWith({
      bubbleId: "b_restart_01",
      repoPath: "/tmp/repo-real",
      cwd: "/tmp",
      now
    });
    expect(callOrder).toEqual(["resolve", "terminate", "remove", "start"]);
    expect(result.bubbleId).toBe("b_restart_01");
    expect(result.tmuxSessionName).toBe("pf-b_restart_01");
    expect(result.previousTmuxSessionExisted).toBe(true);
    expect(result.previousRuntimeSessionRemoved).toBe(true);
  });

  it("maps underlying errors to RestartBubbleError", async () => {
    await expect(
      restartBubble(
        {
          bubbleId: "b_restart_02"
        },
        buildRestartBubbleDependencies({
          resolveBubbleById: () =>
            Promise.reject(new Error("Bubble b_restart_02 does not exist")),
          readRemotePointer: async () => null
        })
      )
    ).rejects.toBeInstanceOf(RestartBubbleError);
  });

  it("restarts even when prior tmux/runtime ownership is already gone", async () => {
    const callOrder: string[] = [];
    const resolveBubbleById = vi.fn(() => {
      callOrder.push("resolve");
      return Promise.resolve({
        bubbleId: "b_restart_03",
        repoPath: "/tmp/repo-real",
        bubbleConfig: {
          id: "b_restart_03"
        },
        bubblePaths: {
          sessionsPath: "/tmp/repo-real/.pairflow/runtime/sessions.json",
          remotePointerPath: "/tmp/repo-real/.pairflow/bubbles/b_restart_03/remote.json"
        }
      } as unknown as ResolvedBubbleById);
    });
    const readRemotePointer = vi.fn(async () => null);
    const terminateBubbleTmuxSession = vi.fn(() => {
      callOrder.push("terminate");
      return Promise.resolve({
        sessionName: "pf-b_restart_03",
        existed: false
      });
    });
    const removeRuntimeSession = vi.fn(() => {
      callOrder.push("remove");
      return Promise.resolve(false);
    });
    const startBubble = vi.fn(() => {
      callOrder.push("start");
      return Promise.resolve({
        bubbleId: "b_restart_03",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_03",
        worktreePath: "/tmp/repo-real/.pairflow/worktrees/b_restart_03"
      } as unknown as StartBubbleResult);
    });

    const result = await restartBubble(
      {
        bubbleId: "b_restart_03",
        repoPath: "/tmp/repo-real"
      },
      buildRestartBubbleDependencies({
        resolveBubbleById,
        readRemotePointer,
        terminateBubbleTmuxSession,
        removeRuntimeSession,
        startBubble
      })
    );

    expect(callOrder).toEqual(["resolve", "terminate", "remove", "start"]);
    expect(result.previousTmuxSessionExisted).toBe(false);
    expect(result.previousRuntimeSessionRemoved).toBe(false);
    expect(result.tmuxSessionName).toBe("pf-b_restart_03");
  });

  it("fails closed when restart is invoked on a started remote bubble", async () => {
    const resolveBubbleById = vi.fn(() =>
      Promise.resolve({
        bubbleId: "b_restart_remote_started_01",
        repoPath: "/tmp/repo-real",
        bubbleConfig: {
          id: "b_restart_remote_started_01"
        },
        bubblePaths: {
          sessionsPath: "/tmp/repo-real/.pairflow/runtime/sessions.json",
          remotePointerPath:
            "/tmp/repo-real/.pairflow/bubbles/b_restart_remote_started_01/remote.json"
        }
      } as unknown as ResolvedBubbleById)
    );
    const readRemotePointer = vi.fn(async () => ({
      kind: "started" as const,
      host: "spark1",
      instanceId: "inst_remote_started_01",
      remoteClonePath: "/remote/repos/pairflow--b_restart_remote_started_01",
      tmuxSession: "pf-b_restart_remote_started_01",
      startedAt: "2026-04-20T18:00:00.000Z"
    }));
    const terminateBubbleTmuxSession = vi.fn();
    const removeRuntimeSession = vi.fn();
    const startBubble = vi.fn();

    await expect(
      restartBubble(
        {
          bubbleId: "b_restart_remote_started_01",
          repoPath: "/tmp/repo-real"
        },
        buildRestartBubbleDependencies({
          resolveBubbleById,
          readRemotePointer,
          terminateBubbleTmuxSession,
          removeRuntimeSession,
          startBubble
        })
      )
    ).rejects.toMatchObject({
      reasonCode: "RESTART_REMOTE_STARTED_UNSUPPORTED"
    });

    expect(terminateBubbleTmuxSession).not.toHaveBeenCalled();
    expect(removeRuntimeSession).not.toHaveBeenCalled();
    expect(startBubble).not.toHaveBeenCalled();
  });
});
