import { describe, expect, it, vi } from "vitest";

import { getBubblePaths } from "../../../../src/v11/infrastructure/artifact/bubble/paths.js";
import {
  attachBubbleV11
} from "../../../../src/v11/application/attach/emitAttachV11.js";
import { SchemaValidationError } from "../../../../src/v11/shared/validation/primitives.js";
import type {
  AttachBubbleError,
  LauncherAvailabilityInput
} from "../../../../src/v11/application/attach/emitAttachV11.js";
import type { AttachLauncher, BubbleConfig } from "../../../../src/types/bubble.js";

function createResolvedBubbleFixture(input: {
  bubbleId: string;
  repoPath: string;
  attachLauncher?: AttachLauncher | undefined;
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
    ...(input.attachLauncher !== undefined
      ? { attach_launcher: input.attachLauncher }
      : {}),
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

function createAvailabilityChecker(
  states: Partial<Record<LauncherAvailabilityInput["launcher"], boolean>>,
  calls: LauncherAvailabilityInput["launcher"][]
) {
  return (input: LauncherAvailabilityInput): Promise<boolean> => {
    calls.push(input.launcher);
    return Promise.resolve(states[input.launcher] ?? false);
  };
}

describe("attachBubbleV11", () => {
  it("uses warp launcher when explicitly requested", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_warp",
      repoPath: "/tmp/pairflow-attach-v11-warp",
      attachLauncher: "warp"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    let capturedYamlPath = "";
    let capturedYamlContent = "";
    const executeAttachCommand = vi.fn(() => Promise.resolve({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          { warp: true },
          availabilityCalls
        ),
        writeYamlFile: (path, content) => {
          capturedYamlPath = path;
          capturedYamlContent = content;
          return Promise.resolve();
        },
        executeAttachCommand
      }
    );

    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      tmuxSessionName: "pf-b_attach_v11_warp",
      launcherRequested: "warp",
      launcherUsed: "warp"
    });
    expect(availabilityCalls).toEqual(["warp"]);
    expect(capturedYamlPath).toMatch(
      /\.warp\/launch_configurations\/pf-b_attach_v11_warp\.yaml$/u
    );
    expect(capturedYamlContent).toContain(
      'exec: "tmux attach -t \'pf-b_attach_v11_warp\'"'
    );
    expect(executeAttachCommand).toHaveBeenCalledWith({
      command: "open 'warp://launch/pf-b_attach_v11_warp'",
      cwd: resolved.repoPath
    });
  });

  it("falls back to copy for auto launcher when no GUI launcher is available", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_auto_copy",
      repoPath: "/tmp/pairflow-attach-v11-auto-copy",
      attachLauncher: "auto"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn(() => Promise.resolve({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker({}, availabilityCalls),
        executeAttachCommand
      }
    );

    expect(availabilityCalls).toEqual([
      "iterm2",
      "ghostty",
      "warp",
      "terminal"
    ]);
    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      tmuxSessionName: "pf-b_attach_v11_auto_copy",
      launcherRequested: "auto",
      launcherUsed: "copy",
      attachCommand: "tmux attach -t 'pf-b_attach_v11_auto_copy'"
    });
    expect(executeAttachCommand).not.toHaveBeenCalled();
  });

  it("prefers bubble attach launcher override over global config", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_bubble_override",
      repoPath: "/tmp/pairflow-attach-v11-bubble-override",
      attachLauncher: "copy"
    });

    const loadPairflowGlobalConfig = vi.fn(() =>
      Promise.reject(
        new SchemaValidationError("global config invalid", [
          { path: "attach_launcher", message: "invalid" }
        ])
      )
    );

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        loadPairflowGlobalConfig
      }
    );

    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      tmuxSessionName: "pf-b_attach_v11_bubble_override",
      launcherRequested: "copy",
      launcherUsed: "copy",
      attachCommand: "tmux attach -t 'pf-b_attach_v11_bubble_override'"
    });
  });

  it("returns launcher_unavailable for explicit launcher when availability check fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_iterm_unavailable",
      repoPath: "/tmp/pairflow-attach-v11-iterm-unavailable",
      attachLauncher: "iterm2"
    });

    await expect(
      attachBubbleV11(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          checkLauncherAvailability: () => Promise.resolve(false)
        }
      )
    ).rejects.toMatchObject({
      launcher: "iterm2",
      failureClass: "launcher_unavailable"
    } satisfies Partial<AttachBubbleError>);
  });

  it("builds remote attach command from started pointer authority", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_started",
      repoPath: "/tmp/pairflow-attach-v11-remote-started",
      attachLauncher: "copy"
    });

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve({
          ...resolved,
          bubbleConfig: {
            ...resolved.bubbleConfig,
            executor: {
              type: "ssh",
              remote: "lab"
            }
          }
        }),
        checkTmuxSessionExists: () => Promise.resolve(true),
        readRemotePointer: () => Promise.resolve({
          kind: "started",
          host: "ssh.example.com",
          instanceId: "remote-instance-v11",
          remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_started",
          tmuxSession: "pf-remote-b_attach_v11_remote_started",
          startedAt: "2026-04-17T10:00:00.000Z"
        }),
        loadPairflowGlobalConfig: () => Promise.resolve({
          remotes: {
            lab: {
              host: "ssh.example.com",
              user: "dev",
              repo_base: "/srv/pairflow"
            }
          }
        })
      }
    );

    expect(result.launcherUsed).toBe("copy");
    expect(result.tmuxSessionName).toBe("pf-remote-b_attach_v11_remote_started");
    expect(result.attachCommand).toContain("'ssh'");
    expect(result.attachCommand).toContain("'dev@ssh.example.com'");
    expect(result.attachCommand).toContain(
      "/srv/pairflow/repo--b_attach_v11_remote_started"
    );
  });

  it("fails closed with start-required when ssh bubble has no remote pointer yet", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_null_pointer",
      repoPath: "/tmp/pairflow-attach-v11-remote-null-pointer",
      attachLauncher: "copy"
    });

    await expect(
      attachBubbleV11(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve({
            ...resolved,
            bubbleConfig: {
              ...resolved.bubbleConfig,
              executor: {
                type: "ssh",
                remote: "lab"
              }
            }
          }),
          checkTmuxSessionExists: () => Promise.resolve(false),
          readRemotePointer: () => Promise.resolve(null),
          loadPairflowGlobalConfig: () => Promise.resolve({
            remotes: {
              lab: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow"
              }
            }
          })
        }
      )
    ).rejects.toMatchObject({
      name: "AttachBubbleError",
      reasonCode: "REMOTE_ATTACH_START_REQUIRED"
    } satisfies Partial<AttachBubbleError>);
  });

  it("prefers explicit CLI port forwards over persisted pointer defaults for remote attach", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_ports",
      repoPath: "/tmp/pairflow-attach-v11-remote-ports",
      attachLauncher: "copy"
    });

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath,
        portForwards: [8080, 3000, 8080]
      },
      {
        resolveBubbleById: () => Promise.resolve({
          ...resolved,
          bubbleConfig: {
            ...resolved.bubbleConfig,
            executor: {
              type: "ssh",
              remote: "lab"
            }
          }
        }),
        checkTmuxSessionExists: () => Promise.resolve(true),
        readRemotePointer: () => Promise.resolve({
          kind: "started",
          host: "ssh.example.com",
          instanceId: "remote-instance-v11-ports",
          remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_ports",
          tmuxSession: "pf-remote-b_attach_v11_remote_ports",
          startedAt: "2026-04-17T10:00:00.000Z",
          portForwards: [5173]
        }),
        loadPairflowGlobalConfig: () => Promise.resolve({
          remotes: {
            lab: {
              host: "ssh.example.com",
              repo_base: "/srv/pairflow"
            }
          }
        })
      }
    );

    expect(result.attachCommand).toContain(
      "'127.0.0.1:3000:127.0.0.1:3000'"
    );
    expect(result.attachCommand).toContain(
      "'127.0.0.1:8080:127.0.0.1:8080'"
    );
    expect(result.attachCommand).not.toContain(
      "'127.0.0.1:5173:127.0.0.1:5173'"
    );
  });

  it("prefers persisted pointer user over global config user for remote attach", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_pointer_user",
      repoPath: "/tmp/pairflow-attach-v11-remote-pointer-user",
      attachLauncher: "copy"
    });

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve({
          ...resolved,
          bubbleConfig: {
            ...resolved.bubbleConfig,
            executor: {
              type: "ssh",
              remote: "lab"
            }
          }
        }),
        checkTmuxSessionExists: () => Promise.resolve(true),
        readRemotePointer: () => Promise.resolve({
          kind: "started",
          host: "ssh.example.com",
          user: "pointer-user",
          instanceId: "remote-instance-v11-user",
          remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_pointer_user",
          tmuxSession: "pf-remote-b_attach_v11_remote_pointer_user",
          startedAt: "2026-04-17T10:00:00.000Z"
        }),
        loadPairflowGlobalConfig: () => Promise.resolve({
          remotes: {
            lab: {
              host: "ssh.example.com",
              user: "config-user",
              repo_base: "/srv/pairflow"
            }
          }
        })
      }
    );

    expect(result.attachCommand).toContain("'pointer-user@ssh.example.com'");
    expect(result.attachCommand).not.toContain("'config-user@ssh.example.com'");
  });

  it("ignores drifted remote config host when started pointer is still valid", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_host_drift",
      repoPath: "/tmp/pairflow-attach-v11-remote-host-drift",
      attachLauncher: "copy"
    });

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve({
          ...resolved,
          bubbleConfig: {
            ...resolved.bubbleConfig,
            executor: {
              type: "ssh",
              remote: "lab"
            }
          }
        }),
        checkTmuxSessionExists: () => Promise.resolve(true),
        readRemotePointer: () => Promise.resolve({
          kind: "started",
          host: "ssh.example.com",
          user: "pointer-user",
          instanceId: "remote-instance-v11-host-drift",
          remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_host_drift",
          tmuxSession: "pf-remote-b_attach_v11_remote_host_drift",
          startedAt: "2026-04-17T10:00:00.000Z"
        }),
        loadPairflowGlobalConfig: () => Promise.resolve({
          remotes: {
            lab: {
              host: "drifted.example.com",
              user: "config-user",
              repo_base: "/srv/pairflow"
            }
          }
        })
      }
    );

    expect(result.attachCommand).toContain("'pointer-user@ssh.example.com'");
    expect(result.attachCommand).not.toContain("drifted.example.com");
    expect(result.attachCommand).not.toContain("'config-user@ssh.example.com'");
  });

  it("returns config-invalid when started remote pointer is paired with a non-ssh executor", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_non_ssh_executor",
      repoPath: "/tmp/pairflow-attach-v11-remote-non-ssh-executor",
      attachLauncher: "copy"
    });

    await expect(
      attachBubbleV11(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          readRemotePointer: () => Promise.resolve({
            kind: "started",
            host: "ssh.example.com",
            instanceId: "remote-instance-v11-non-ssh",
            remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_non_ssh_executor",
            tmuxSession: "pf-remote-b_attach_v11_remote_non_ssh_executor",
            startedAt: "2026-04-17T10:00:00.000Z"
          }),
          loadPairflowGlobalConfig: () => Promise.resolve({
            remotes: {
              lab: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow"
              }
            }
          })
        }
      )
    ).rejects.toMatchObject({
      name: "AttachBubbleError",
      reasonCode: "REMOTE_ATTACH_CONFIG_INVALID",
      context: {
        reason: "remote_executor_invalid"
      }
    } satisfies Partial<AttachBubbleError>);
  });

  it("surfaces diagnostics when remote config supplement load fails unexpectedly", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_config_supplement_failed",
      repoPath: "/tmp/pairflow-attach-v11-remote-config-supplement-failed",
      attachLauncher: "copy"
    });

    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve({
          ...resolved,
          bubbleConfig: {
            ...resolved.bubbleConfig,
            executor: {
              type: "ssh",
              remote: "lab"
            }
          }
        }),
        checkTmuxSessionExists: () => Promise.resolve(true),
        readRemotePointer: () => Promise.resolve({
          kind: "started",
          host: "ssh.example.com",
          instanceId: "remote-instance-v11-config-supplement",
          remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_config_supplement_failed",
          tmuxSession: "pf-remote-b_attach_v11_remote_config_supplement_failed",
          startedAt: "2026-04-17T10:00:00.000Z"
        }),
        loadPairflowGlobalConfig: () => {
          throw new Error("EACCES while reading ~/.config/pairflow/config.toml");
        }
      }
    );

    expect(result.attachCommand).toContain("'ssh.example.com'");
    expect(result.diagnostics).toHaveLength(1);
    const diagnostic = result.diagnostics?.[0];
    expect(diagnostic?.code).toBe("REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE");
    expect(diagnostic?.context.reason).toBe("remote_config_supplement_unavailable");
    expect(diagnostic?.context.remoteAlias).toBe("lab");
    expect(diagnostic?.context.remoteHost).toBe("ssh.example.com");
  });

  it("falls back to default launcher for started remote attach when global config load fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_default_launcher_on_config_error",
      repoPath: "/tmp/pairflow-attach-v11-remote-default-launcher-on-config-error"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const result = await attachBubbleV11(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve({
          ...resolved,
          bubbleConfig: {
            ...resolved.bubbleConfig,
            executor: {
              type: "ssh",
              remote: "lab"
            }
          }
        }),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker({}, availabilityCalls),
        readRemotePointer: () => Promise.resolve({
          kind: "started",
          host: "ssh.example.com",
          instanceId: "remote-instance-v11-default-launcher",
          remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_default_launcher_on_config_error",
          tmuxSession: "pf-remote-b_attach_v11_remote_default_launcher_on_config_error",
          startedAt: "2026-04-17T10:00:00.000Z"
        }),
        loadPairflowGlobalConfig: () => {
          throw new Error("global config temporarily unavailable");
        }
      }
    );

    expect(availabilityCalls).toEqual([
      "iterm2",
      "ghostty",
      "warp",
      "terminal"
    ]);
    expect(result.launcherRequested).toBe("auto");
    expect(result.launcherUsed).toBe("copy");
    expect(result.attachCommand).toContain("'ssh.example.com'");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics?.[0]?.context.reason).toBe(
      "remote_config_supplement_unavailable"
    );
  });

  it("fails closed when remote pointer read is malformed", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_pointer_invalid",
      repoPath: "/tmp/pairflow-attach-v11-remote-pointer-invalid",
      attachLauncher: "copy"
    });

    await expect(
      attachBubbleV11(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve({
            ...resolved,
            bubbleConfig: {
              ...resolved.bubbleConfig,
              executor: {
                type: "ssh",
                remote: "lab"
              }
            }
          }),
          checkTmuxSessionExists: () => Promise.resolve(true),
          readRemotePointer: () => {
            throw new SchemaValidationError("remote pointer invalid", [
              { path: "tmuxSession", message: "Required" }
            ]);
          },
          loadPairflowGlobalConfig: () => Promise.resolve({
            remotes: {
              lab: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow"
              }
            }
          })
        }
      )
    ).rejects.toMatchObject({
      name: "AttachBubbleError",
      reasonCode: "REMOTE_ATTACH_POINTER_INVALID"
    } satisfies Partial<AttachBubbleError>);
  });

  it("fails closed when started pointer host is blank even if dependency bypasses artifact validation", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_v11_remote_blank_host",
      repoPath: "/tmp/pairflow-attach-v11-remote-blank-host",
      attachLauncher: "copy"
    });

    await expect(
      attachBubbleV11(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve({
            ...resolved,
            bubbleConfig: {
              ...resolved.bubbleConfig,
              executor: {
                type: "ssh",
                remote: "lab"
              }
            }
          }),
          checkTmuxSessionExists: () => Promise.resolve(true),
          readRemotePointer: () => Promise.resolve({
            kind: "started",
            host: "   ",
            instanceId: "remote-instance-v11-blank-host",
            remoteClonePath: "/srv/pairflow/repo--b_attach_v11_remote_blank_host",
            tmuxSession: "pf-remote-b_attach_v11_remote_blank_host",
            startedAt: "2026-04-17T10:00:00.000Z"
          }),
          loadPairflowGlobalConfig: () => Promise.resolve({
            remotes: {
              lab: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow"
              }
            }
          })
        }
      )
    ).rejects.toMatchObject({
      name: "AttachBubbleError",
      reasonCode: "REMOTE_ATTACH_POINTER_INVALID"
    } satisfies Partial<AttachBubbleError>);
  });
});
