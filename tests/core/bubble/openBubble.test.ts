import { describe, expect, it } from "vitest";

import { getBubblePaths } from "../../../src/core/bubble/paths.js";
import { openBubble } from "../../../src/core/bubble/openBubble.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";

function createResolvedBubbleFixture(input: {
  bubbleId: string;
  repoPath: string;
  openCommand?: string | undefined;
}) {
  const config: BubbleConfig = {
    id: input.bubbleId,
    repo_path: input.repoPath,
    base_branch: "main",
    bubble_branch: `bubble/${input.bubbleId}`,
    work_mode: "worktree",
    quality_mode: "strict",
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    commit_requires_approval: true,
    ...(input.openCommand !== undefined ? { open_command: input.openCommand } : {}),
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

  return {
    bubbleId: input.bubbleId,
    bubbleConfig: config,
    bubblePaths: getBubblePaths(input.repoPath, input.bubbleId),
    repoPath: input.repoPath
  };
}

describe("openBubble", () => {
  it("renders open_command with worktree interpolation and executes it", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_01",
      repoPath: "/tmp/pairflow-open-01",
      openCommand: "editor --path {{worktree_path}}"
    });

    let captured: { command: string; cwd: string } | undefined;
    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.resolve(),
        executeOpenCommand: (input) => {
          captured = input;
          return Promise.resolve({
            exitCode: 0,
            stdout: "",
            stderr: ""
          });
        }
      }
    );

    expect(result.bubbleId).toBe(resolved.bubbleId);
    expect(result.worktreePath).toBe(resolved.bubblePaths.worktreePath);
    expect(captured).toEqual({
      command: `editor --path '${resolved.bubblePaths.worktreePath}'`,
      cwd: resolved.repoPath
    });
  });

  it("appends worktree path when open_command has no placeholder", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_02",
      repoPath: "/tmp/pairflow-open-02",
      openCommand: "editor --reuse-window"
    });

    let capturedCommand = "";
    await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.resolve(),
        executeOpenCommand: (input) => {
          capturedCommand = input.command;
          return Promise.resolve({
            exitCode: 0,
            stdout: "",
            stderr: ""
          });
        }
      }
    );

    expect(capturedCommand).toBe(
      `editor --reuse-window '${resolved.bubblePaths.worktreePath}'`
    );
  });

  it("rejects when worktree is missing", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_03",
      repoPath: "/tmp/pairflow-open-03"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved)
        }
      )
    ).rejects.toThrow(/worktree/i);
  });

  it("surfaces open command failure details", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_04",
      repoPath: "/tmp/pairflow-open-04"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          assertWorktreeExists: () => Promise.resolve(),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 127,
              stdout: "",
              stderr: "editor: command not found\n"
            })
        }
      )
    ).rejects.toThrow(/command not found/u);
  });
});
