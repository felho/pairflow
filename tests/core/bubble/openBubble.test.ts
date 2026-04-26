import { describe, expect, it, vi } from "vitest";

import { BubbleLookupError } from "../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { SchemaValidationError } from "../../../src/v11/shared/validation/primitives.js";
import { getBubblePaths } from "../../../src/v11/infrastructure/artifact/bubble/paths.js";
import {
  asOpenBubbleError,
  openBubble,
  OpenBubbleError
} from "../../../src/v11/application/open/emitOpenV11.js";
import type {
  BubbleConfig,
  BubbleRemotePointerStarted
} from "../../../src/types/bubble.js";

function createResolvedBubbleFixture(input: {
  bubbleId: string;
  repoPath: string;
  openCommand?: string | undefined;
  openRemoteCommand?: string | undefined;
  executorRemote?: string | undefined;
}) {
  const config: BubbleConfig = {
    id: input.bubbleId,
    repo_path: input.repoPath,
    base_branch: "main",
    bubble_branch: `bubble/${input.bubbleId}`,
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: "code",
    pairflow_command_profile: "external",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    severity_gate_round: 4,
    commit_requires_approval: true,
    attach_launcher: "auto",
    ...(input.openCommand !== undefined ? { open_command: input.openCommand } : {}),
    ...(input.openRemoteCommand !== undefined
      ? { open_remote_command: input.openRemoteCommand }
      : {}),
    ...(input.executorRemote !== undefined
      ? {
          executor: {
            type: "ssh" as const,
            remote: input.executorRemote
          }
        }
      : {}),
    agents: {
      implementer: "codex",
      reviewer: "claude",
      meta_reviewer: "codex"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: true
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

function createStartedRemotePointerFixture(
  input: Partial<BubbleRemotePointerStarted> = {}
): BubbleRemotePointerStarted {
  return {
    kind: "started",
    host: input.host ?? "ssh.example.com",
    ...(input.user !== undefined ? { user: input.user } : {}),
    instanceId: input.instanceId ?? "i-open-remote-01",
    remoteClonePath: input.remoteClonePath ?? "/srv/pairflow/repo--b_open_remote",
    tmuxSession: input.tmuxSession ?? "pf-b_open_remote",
    startedAt: input.startedAt ?? "2026-04-20T12:00:00.000Z",
    ...(input.portForwards !== undefined ? { portForwards: input.portForwards } : {})
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
    expect(result.workspaceKind).toBe("local_worktree");
    expect(result.workspacePath).toBe(resolved.bubblePaths.worktreePath);
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

  it("keeps bubble open_command precedence even when global config loader would fail", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_02b",
      repoPath: "/tmp/pairflow-open-02b",
      openCommand: "editor --reuse-window {{worktree_path}}"
    });

    const loadPairflowGlobalConfig = vi.fn(() => {
      throw new SchemaValidationError("Invalid Pairflow global config", [
        {
          path: "open_command",
          message: "Must be a non-empty string"
        }
      ]);
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

  it("rejects unsupported non-local placeholders in local open_command", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_07b",
      repoPath: "/tmp/pairflow-open-07b",
      openCommand: "editor {{remote_host}}"
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
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/unsupported or unresolved placeholders/u);
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

  it("renders remote open_remote_command from started pointer authority and skips local worktree checks", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_01",
      repoPath: "/tmp/pairflow-open-remote-01",
      openRemoteCommand:
        "editor --host {{remote_host}} --user {{remote_user}} --path {{remote_clone_path}} --authority {{remote_authority}} --alias {{remote_alias}}",
      executorRemote: "homelab"
    });
    const assertWorktreeExists = vi.fn(() => Promise.resolve());
    const loadPairflowGlobalConfig = vi.fn(() =>
      Promise.resolve({
        remotes: {
          homelab: {
            host: "ssh.example.com",
            repo_base: "/srv/pairflow",
            user: "dev"
          }
        }
      })
    );
    let captured: { command: string; cwd: string } | undefined;

    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists,
        loadPairflowGlobalConfig,
        readRemotePointer: () => Promise.resolve(createStartedRemotePointerFixture()),
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

    expect(assertWorktreeExists).not.toHaveBeenCalled();
    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      workspaceKind: "remote_clone",
      workspacePath: "/srv/pairflow/repo--b_open_remote",
      remoteAuthority: "dev@ssh.example.com",
      command:
        "editor --host 'ssh.example.com' --user 'dev' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'dev@ssh.example.com' --alias 'homelab'"
    });
    expect(captured).toEqual({
      command:
        "editor --host 'ssh.example.com' --user 'dev' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'dev@ssh.example.com' --alias 'homelab'",
      cwd: resolved.repoPath
    });
  });

  it("renders host-only remote authority when no resolved remote user is available", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_01b",
      repoPath: "/tmp/pairflow-open-remote-01b",
      openRemoteCommand:
        "editor --host {{remote_host}} --path {{remote_clone_path}} --authority {{remote_authority}}",
      executorRemote: "homelab"
    });
    let captured: { command: string; cwd: string } | undefined;

    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.reject(new Error("should not run")),
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            remotes: {
              homelab: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow"
              }
            }
          }),
        readRemotePointer: () => Promise.resolve(createStartedRemotePointerFixture()),
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

    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      workspaceKind: "remote_clone",
      workspacePath: "/srv/pairflow/repo--b_open_remote",
      remoteAuthority: "ssh.example.com",
      command:
        "editor --host 'ssh.example.com' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'ssh.example.com'"
    });
    expect(captured).toEqual({
      command:
        "editor --host 'ssh.example.com' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'ssh.example.com'",
      cwd: resolved.repoPath
    });
  });

  it("keeps bubble open_remote_command precedence even when global config loader would fail", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_01c",
      repoPath: "/tmp/pairflow-open-remote-01c",
      openRemoteCommand:
        "editor --host {{remote_host}} --path {{remote_clone_path}} --authority {{remote_authority}}",
      executorRemote: "homelab"
    });
    const loadPairflowGlobalConfig = vi.fn(() => {
      throw new SchemaValidationError("Invalid Pairflow global config", [
        {
          path: "remotes.homelab.host",
          message: "Must be a non-empty string"
        }
      ]);
    });
    let captured: { command: string; cwd: string } | undefined;

    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.reject(new Error("should not run")),
        loadPairflowGlobalConfig,
        readRemotePointer: () =>
          Promise.resolve(
            createStartedRemotePointerFixture({
              user: "dev"
            })
          ),
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

    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      workspaceKind: "remote_clone",
      workspacePath: "/srv/pairflow/repo--b_open_remote",
      remoteAuthority: "dev@ssh.example.com",
      command:
        "editor --host 'ssh.example.com' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'dev@ssh.example.com'"
    });
    expect(captured).toEqual({
      command:
        "editor --host 'ssh.example.com' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'dev@ssh.example.com'",
      cwd: resolved.repoPath
    });
    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
  });

  it("keeps bubble remote_user placeholder precedence when the started pointer already has user", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_01d",
      repoPath: "/tmp/pairflow-open-remote-01d",
      openRemoteCommand:
        "editor --user {{remote_user}} --path {{remote_clone_path}} --authority {{remote_authority}}",
      executorRemote: "homelab"
    });
    const loadPairflowGlobalConfig = vi.fn(() => {
      throw new SchemaValidationError("Invalid Pairflow global config", [
        {
          path: "remotes.homelab.user",
          message: "Must be a non-empty string"
        }
      ]);
    });
    let captured: { command: string; cwd: string } | undefined;

    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.reject(new Error("should not run")),
        loadPairflowGlobalConfig,
        readRemotePointer: () =>
          Promise.resolve(
            createStartedRemotePointerFixture({
              user: "dev"
            })
          ),
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

    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      workspaceKind: "remote_clone",
      workspacePath: "/srv/pairflow/repo--b_open_remote",
      remoteAuthority: "dev@ssh.example.com",
      command:
        "editor --user 'dev' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'dev@ssh.example.com'"
    });
    expect(captured).toEqual({
      command:
        "editor --user 'dev' --path '/srv/pairflow/repo--b_open_remote' "
        + "--authority 'dev@ssh.example.com'",
      cwd: resolved.repoPath
    });
    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
  });

  it("uses the built-in remote default with dedicated URI encoding", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_02",
      repoPath: "/tmp/pairflow-open-remote-02",
      executorRemote: "workstation"
    });

    let capturedCommand = "";
    await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.reject(new Error("should not run")),
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            remotes: {
              workstation: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow",
                user: "dev"
              }
            }
          }),
        readRemotePointer: () =>
          Promise.resolve(
            createStartedRemotePointerFixture({
              remoteClonePath: "/srv/pairflow clones/repo's bubble"
            })
          ),
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
      "code --folder-uri "
      + "\"vscode-remote://ssh-remote+dev%40ssh.example.com/srv/pairflow%20clones/repo%27s%20bubble\""
    );
  });

  it("URI-encodes the canonical VS Code remote folder URI inside custom remote templates", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_02b",
      repoPath: "/tmp/pairflow-open-remote-02b",
      executorRemote: "workstation",
      openRemoteCommand:
        'code --reuse-window --folder-uri "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}"'
    });

    let capturedCommand = "";
    await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            remotes: {
              workstation: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow",
                user: "dev"
              }
            }
          }),
        readRemotePointer: () =>
          Promise.resolve(
            createStartedRemotePointerFixture({
              remoteClonePath: "/srv/pairflow clones/repo's bubble"
            })
          ),
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
      "code --reuse-window --folder-uri "
      + "\"vscode-remote://ssh-remote+dev%40ssh.example.com/srv/pairflow%20clones/repo%27s%20bubble\""
    );
  });

  it("fails closed for remote bubbles that are created but not started", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_03",
      repoPath: "/tmp/pairflow-open-remote-03",
      executorRemote: "workstation"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              remotes: {
                workstation: {
                  host: "ssh.example.com",
                  repo_base: "/srv/pairflow"
                }
              }
            }),
          readRemotePointer: () =>
            Promise.resolve({
              kind: "created",
              host: "ssh.example.com"
            }),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/start --id b_open_remote_03/u);
  });

  it("fails closed for remote bubbles when the remote pointer is missing", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_03b",
      repoPath: "/tmp/pairflow-open-remote-03b",
      executorRemote: "workstation"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              remotes: {
                workstation: {
                  host: "ssh.example.com",
                  repo_base: "/srv/pairflow"
                }
              }
            }),
          readRemotePointer: () => Promise.resolve(null),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/start --id b_open_remote_03b/u);
  });

  it("does not derive remote authority from the local repo path or worktree path", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_03c",
      repoPath: "/tmp/operator-laptop/source-repo",
      openRemoteCommand:
        "editor --path {{remote_clone_path}} --authority {{remote_authority}} --host {{remote_host}}",
      executorRemote: "workstation"
    });
    resolved.bubblePaths.worktreePath =
      "/tmp/operator-laptop/source-repo/.pairflow/worktrees/local-shadow-authority";

    let captured: { command: string; cwd: string } | undefined;
    const result = await openBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        assertWorktreeExists: () => Promise.reject(new Error("should not run")),
        loadPairflowGlobalConfig: () =>
          Promise.resolve({
            remotes: {
              workstation: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow",
                user: "dev"
              }
            }
          }),
        readRemotePointer: () =>
          Promise.resolve(
            createStartedRemotePointerFixture({
              remoteClonePath: "/srv/pairflow/remote-authority-clone"
            })
          ),
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

    expect(result.workspaceKind).toBe("remote_clone");
    expect(result.workspacePath).toBe("/srv/pairflow/remote-authority-clone");
    expect(result.remoteAuthority).toBe("dev@ssh.example.com");
    expect(captured?.command).toContain("'/srv/pairflow/remote-authority-clone'");
    expect(captured?.command).toContain("'dev@ssh.example.com'");
    expect(captured?.command).not.toContain(resolved.repoPath);
    expect(captured?.command).not.toContain(resolved.bubblePaths.worktreePath);
  });

  it("fails closed when configured remote host drifts from the started pointer host", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_04",
      repoPath: "/tmp/pairflow-open-remote-04",
      executorRemote: "workstation"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              remotes: {
                workstation: {
                  host: "other.example.com",
                  repo_base: "/srv/pairflow",
                  user: "dev"
                }
              }
            }),
          readRemotePointer: () => Promise.resolve(createStartedRemotePointerFixture()),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/refused host mismatch/u);
  });

  it("omits empty remoteHost from created-pointer start-required diagnostics", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_04b",
      repoPath: "/tmp/pairflow-open-remote-04b",
      executorRemote: "workstation"
    });

    try {
      await openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () => Promise.resolve({}),
          readRemotePointer: () =>
            Promise.resolve({
              kind: "created",
              host: ""
            }),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      );
      throw new Error("Expected openBubble to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenBubbleError);
      expect((error as OpenBubbleError).context?.remoteHost).toBeUndefined();
    }
  });

  it("fails closed when globally resolved remote authority is ambiguous", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_05",
      repoPath: "/tmp/pairflow-open-remote-05",
      executorRemote: "workstation"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              open_remote_command: "editor --user {{remote_user}}",
              remotes: {
                workstation: {
                  host: "ssh.example.com",
                  repo_base: "/srv/pairflow",
                  user: "alice"
                }
              }
            }),
          readRemotePointer: () =>
            Promise.resolve(
              createStartedRemotePointerFixture({
                user: "bob"
              })
            ),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/ambiguous authority/u);
  });

  it("fails closed when remote placeholders remain unresolved", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_06",
      repoPath: "/tmp/pairflow-open-remote-06",
      executorRemote: "workstation",
      openRemoteCommand: "editor --user {{remote_user}}"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              remotes: {
                workstation: {
                  host: "ssh.example.com",
                  repo_base: "/srv/pairflow"
                }
              }
            }),
          readRemotePointer: () =>
            Promise.resolve(
              createStartedRemotePointerFixture()
            ),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/requires placeholder \{\{remote_user\}\}/u);
  });

  it("fails closed when a remote placeholder is embedded inside a non-canonical URI token", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_06c",
      repoPath: "/tmp/pairflow-open-remote-06c",
      executorRemote: "workstation",
      openRemoteCommand: "editor ssh://{{remote_authority}}{{remote_clone_path}}"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              remotes: {
                workstation: {
                  host: "ssh.example.com",
                  repo_base: "/srv/pairflow",
                  user: "dev"
                }
              }
            }),
          readRemotePointer: () => Promise.resolve(createStartedRemotePointerFixture()),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/unsupported embedded context/u);
  });

  it("fails closed when the started pointer remote clone path is not absolute", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_remote_06b",
      repoPath: "/tmp/pairflow-open-remote-06b",
      executorRemote: "workstation"
    });

    await expect(
      openBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          loadPairflowGlobalConfig: () =>
            Promise.resolve({
              remotes: {
                workstation: {
                  host: "ssh.example.com",
                  repo_base: "/srv/pairflow"
                }
              }
            }),
          readRemotePointer: () =>
            Promise.resolve(
              createStartedRemotePointerFixture({
                remoteClonePath: "relative/path"
              })
            ),
          executeOpenCommand: () =>
            Promise.resolve({
              exitCode: 0,
              stdout: "",
              stderr: ""
            })
        }
      )
    ).rejects.toThrow(/absolute remote clone path/u);
  });

  it("preserves the invalid global config reason code when local open resolves through the global config loader", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_open_local_schema_01",
      repoPath: "/tmp/pairflow-open-local-schema-01"
    });

    try {
      await openBubble(
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
            )
        }
      );
      throw new Error("Expected openBubble to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenBubbleError);
      expect((error as OpenBubbleError).context?.reason_code).toBe(
        "OPEN_GLOBAL_CONFIG_INVALID"
      );
    }
  });

  it("normalizes bubble lookup failures with a stable error code", () => {
    const error = new BubbleLookupError("bubble not found");

    expect(() => asOpenBubbleError(error)).toThrowError(OpenBubbleError);

    try {
      asOpenBubbleError(error);
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(OpenBubbleError);
      expect((thrown as OpenBubbleError).context?.reason_code).toBe(
        "OPEN_BUBBLE_LOOKUP_ERROR"
      );
    }
  });

  it("normalizes unexpected failures with a stable error code", () => {
    const error = new Error("unexpected");

    expect(() => asOpenBubbleError(error)).toThrowError(OpenBubbleError);

    try {
      asOpenBubbleError(error);
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(OpenBubbleError);
      expect((thrown as OpenBubbleError).context?.reason_code).toBe(
        "OPEN_UNEXPECTED_ERROR"
      );
    }
  });
});
