import { describe, expect, it, vi } from "vitest";

import { SchemaValidationError } from "../../../src/core/validation.js";
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
    review_artifact_type: "auto",
    pairflow_command_profile: "external",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    severity_gate_round: 4,
    commit_requires_approval: true,
    attach_launcher: "auto",
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
    },
    enforcement_mode: {
      all_gate: "advisory",
      docs_gate: "advisory"
    },
    doc_contract_gates: {
      round_gate_applies_after: 2
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
  it("renders bubble open_command with worktree interpolation and executes it", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_01",
      repoPath: "/tmp/pairflow-open-01",
      openCommand: "editor --path {{worktree_path}}"
    });

    const loadPairflowGlobalConfig = vi.fn(() => Promise.resolve({}));
    let captured: { command: string; cwd: string } | undefined;
    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.resolve(),
        loadPairflowGlobalConfig,
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
    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
  });

  it("prefers bubble open_command over global open_command", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_02",
      repoPath: "/tmp/pairflow-open-02",
      openCommand: "editor --reuse-window {{worktree_path}}"
    });

    const loadPairflowGlobalConfig = vi.fn(() =>
      Promise.resolve({ open_command: "code {{worktree_path}}" })
    );
    let capturedCommand = "";
    await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.resolve(),
        loadPairflowGlobalConfig,
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
    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
  });

  it("uses global open_command when bubble override is not set", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_03",
      repoPath: "/tmp/pairflow-open-03"
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
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            open_command: "code --reuse-window {{worktree_path}}"
          }),
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
      `code --reuse-window '${resolved.bubblePaths.worktreePath}'`
    );
  });

  it("falls back to built-in default when neither bubble nor global open_command is set", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_04",
      repoPath: "/tmp/pairflow-open-04"
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
        loadPairflowGlobalConfig: () => Promise.resolve({}),
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

    expect(capturedCommand).toBe(`cursor '${resolved.bubblePaths.worktreePath}'`);
  });

  it("replaces all worktree placeholders in resolved template", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_05",
      repoPath: "/tmp/pairflow-open-05"
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
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            open_command:
              "editor --left {{worktree_path}} --right {{worktree_path}}"
          }),
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

    const quotedPath = `'${resolved.bubblePaths.worktreePath}'`;
    expect(capturedCommand).toBe(`editor --left ${quotedPath} --right ${quotedPath}`);
  });

  it("appends worktree path when resolved open_command has no placeholder", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_06",
      repoPath: "/tmp/pairflow-open-06"
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
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            open_command: "editor --reuse-window"
          }),
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

  it("keeps worktree paths with spaces as one quoted argument", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_07",
      repoPath: "/tmp/pairflow open 07",
      openCommand: "editor --path {{worktree_path}}"
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
        loadPairflowGlobalConfig: () => Promise.resolve({}),
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
      `editor --path '${resolved.bubblePaths.worktreePath}'`
    );
  });

  it("rejects whitespace-only resolved open command template", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_08",
      repoPath: "/tmp/pairflow-open-08"
    });
    const executeOpenCommand = vi.fn(() =>
      Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })
    );
    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          assertWorktreeExists: () => Promise.resolve(),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              open_command: "   "
            }),
          executeOpenCommand
        }
      )
    ).rejects.toThrow(/open_command cannot be empty/u);
    expect(executeOpenCommand).not.toHaveBeenCalled();
  });

  it("fails with explicit error when global config is invalid", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_09",
      repoPath: "/tmp/pairflow-open-09"
    });
    const executeOpenCommand = vi.fn(() =>
      Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })
    );

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          assertWorktreeExists: () => Promise.resolve(),
          loadPairflowGlobalConfig: () =>
            Promise.reject(
              new SchemaValidationError("Invalid Pairflow global config", [
                {
                  path: "open_command",
                  message: "Must be a non-empty string"
                }
              ])
            ),
          executeOpenCommand
        }
      )
    ).rejects.toThrow(/Invalid global Pairflow config/u);
    expect(executeOpenCommand).not.toHaveBeenCalled();
  });

  it("fails with explicit error when global config load has non-schema io error", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_10",
      repoPath: "/tmp/pairflow-open-10"
    });
    const executeOpenCommand = vi.fn(() =>
      Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })
    );

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          assertWorktreeExists: () => Promise.resolve(),
          loadPairflowGlobalConfig: () => {
            const error = new Error("permission denied") as NodeJS.ErrnoException;
            error.code = "EACCES";
            return Promise.reject(error);
          },
          executeOpenCommand
        }
      )
    ).rejects.toThrow(/Failed to load global Pairflow config/u);
    expect(executeOpenCommand).not.toHaveBeenCalled();
  });

  it("rejects when worktree is missing", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_11",
      repoPath: "/tmp/pairflow-open-11"
    });

    const assertWorktreeExists = vi.fn(() =>
      Promise.reject(new Error("worktree missing"))
    );

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          assertWorktreeExists
        }
      )
    ).rejects.toThrow(/worktree/i);
    expect(assertWorktreeExists).toHaveBeenCalledWith(
      resolved.bubblePaths.worktreePath
    );
  });

  it("surfaces open command failure details", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_12",
      repoPath: "/tmp/pairflow-open-12"
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
          loadPairflowGlobalConfig: () => Promise.resolve({}),
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
