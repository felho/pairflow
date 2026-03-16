import { describe, expect, it, vi } from "vitest";

import {
  restartBubble,
  RestartBubbleError
} from "../../../src/core/bubble/restartBubble.js";
import type { ResolvedBubbleById } from "../../../src/core/bubble/bubbleLookup.js";
import type { StartBubbleResult } from "../../../src/core/bubble/startBubble.js";

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
        sessionsPath: "/tmp/repo-real/.pairflow/runtime/sessions.json"
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
      {
        resolveBubbleById,
        terminateBubbleTmuxSession,
        removeRuntimeSession,
        startBubble
      }
    );

    expect(resolveBubbleById).toHaveBeenCalledWith({
      bubbleId: "b_restart_01",
      repoPath: "/tmp/repo-symlink",
      cwd: "/tmp"
    });
    expect(terminateBubbleTmuxSession).toHaveBeenCalledWith({
      bubbleId: "b_restart_01"
    });
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
        {
          resolveBubbleById: () =>
            Promise.reject(new Error("Bubble b_restart_02 does not exist"))
        }
      )
    ).rejects.toBeInstanceOf(RestartBubbleError);
  });
});
