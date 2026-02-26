import { describe, expect, it } from "vitest";

import { refreshReviewerContext } from "../../../src/core/runtime/reviewerContext.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";
import type { TmuxRunResult, TmuxRunner } from "../../../src/core/runtime/tmuxManager.js";

const baseConfig: BubbleConfig = {
  id: "b_reviewer_ctx_01",
  repo_path: "/tmp/repo",
  base_branch: "main",
  bubble_branch: "bubble/b_reviewer_ctx_01",
  work_mode: "worktree",
  quality_mode: "strict",
  review_artifact_type: "auto",
  reviewer_context_mode: "fresh",
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

describe("refreshReviewerContext", () => {
  it("respawns reviewer pane when runtime session exists", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
        b_reviewer_ctx_01: {
          bubbleId: "b_reviewer_ctx_01",
          repoPath: "/tmp/repo",
          worktreePath: "/tmp/worktree",
          tmuxSessionName: "pf-b_reviewer_ctx_01",
          updatedAt: "2026-02-23T10:00:00.000Z"
        }
      })
    });

    expect(result).toEqual({
      refreshed: true
    });
    expect(calls[0]?.[0]).toBe("respawn-pane");
    expect(calls[0]?.[3]).toBe("pf-b_reviewer_ctx_01:0.2");
  });

  it("returns no_runtime_session when runtime session is missing", async () => {
    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toEqual({
      refreshed: false,
      reason: "no_runtime_session"
    });
  });
});
