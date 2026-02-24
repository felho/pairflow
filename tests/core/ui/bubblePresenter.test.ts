import { describe, expect, it } from "vitest";

import {
  presentBubbleSummaryFromListEntry,
  presentRuntimeHealth
} from "../../../src/core/ui/presenters/bubblePresenter.js";

describe("bubblePresenter", () => {
  it("marks runtime as stale when a runtime-expected state has no session", () => {
    const runtime = presentRuntimeHealth("RUNNING", null);

    expect(runtime.expected).toBe(true);
    expect(runtime.present).toBe(false);
    expect(runtime.stale).toBe(true);
  });

  it("marks runtime as stale when a non-runtime state still has session", () => {
    const runtime = presentRuntimeHealth("DONE", {
      bubbleId: "b_1",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      tmuxSessionName: "pf-b_1",
      updatedAt: "2026-02-24T12:00:00.000Z"
    });

    expect(runtime.expected).toBe(false);
    expect(runtime.present).toBe(true);
    expect(runtime.stale).toBe(true);
  });

  it("presents list entries with runtime metadata for attach gating", () => {
    const presented = presentBubbleSummaryFromListEntry({
      bubbleId: "b_attach_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "WAITING_HUMAN",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-24T12:00:00.000Z",
      lastCommandAt: "2026-02-24T12:00:30.000Z",
      runtimeSession: {
        bubbleId: "b_attach_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-b_attach_01",
        updatedAt: "2026-02-24T12:00:30.000Z"
      }
    });

    expect(presented.runtime.present).toBe(true);
    expect(presented.runtime.stale).toBe(false);
    expect(presented.runtimeSession?.tmuxSessionName).toBe("pf-b_attach_01");
  });
});
