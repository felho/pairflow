import { describe, expect, it, vi } from "vitest";

import { getBubblePaths } from "../../../src/v11/infrastructure/artifact/bubble/paths.js";
import {
  attachBubble
} from "../../../src/v11/application/attach/emitAttachV11.js";
import { buildBubbleTmuxSessionName } from "../../../src/v11/shared/bubble/tmuxSessionName.js";
import { SchemaValidationError } from "../../../src/v11/shared/validation/primitives.js";
import type {
  AttachBubbleError,
  LauncherAvailabilityInput
} from "../../../src/v11/application/attach/emitAttachV11.js";
import type { BubbleConfig } from "../../../src/v11/shared/config/bubbleConfigTypes.js";
import type {
  AttachLauncher
} from "../../../src/v11/shared/bubbleAttachment/attachLauncherTypes.js";

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

function createAvailabilityChecker(
  states: Partial<Record<LauncherAvailabilityInput["launcher"], boolean>>,
  calls: LauncherAvailabilityInput["launcher"][]
) {
  return (input: LauncherAvailabilityInput): Promise<boolean> => {
    calls.push(input.launcher);
    return Promise.resolve(states[input.launcher] ?? false);
  };
}

describe("attachBubble", () => {
  it("requires resolveBubbleById dependency", async () => {
    await expect(
      attachBubble({
        bubbleId: "b_attach_missing_resolve_dependency",
        repoPath: "/tmp/pairflow-attach-missing-resolve-dependency"
      })
    ).rejects.toMatchObject({
      name: "AttachBubbleError",
      context: {
        reason: "resolve_bubble_dependency_missing"
      }
    } satisfies Partial<AttachBubbleError>);
  });

  it("uses warp launcher when explicitly requested", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_warp",
      repoPath: "/tmp/pairflow-attach-warp",
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

    const result = await attachBubble(
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
      tmuxSessionName: "pf-b_attach_warp",
      launcherRequested: "warp",
      launcherUsed: "warp"
    });
    expect(availabilityCalls).toEqual(["warp"]);
    expect(capturedYamlPath).toMatch(
      /\.warp\/launch_configurations\/pf-b_attach_warp\.yaml$/u
    );
    expect(capturedYamlContent).toContain(
      'exec: "tmux attach -t \'pf-b_attach_warp\'"'
    );
    expect(executeAttachCommand).toHaveBeenCalledTimes(1);
    expect(executeAttachCommand).toHaveBeenCalledWith({
      command: "open 'warp://launch/pf-b_attach_warp'",
      cwd: resolved.repoPath
    });
  });

  it("uses URI-capability probe for warp availability before launch", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_warp_probe",
      repoPath: "/tmp/pairflow-attach-warp-probe",
      attachLauncher: "warp"
    });

    const executedCommands: string[] = [];
    let capturedYamlPath = "";
    const executeAttachCommand = vi.fn((input: { command: string }) => {
      executedCommands.push(input.command);
      if (
        input.command ===
        "osascript -e 'POSIX path of (path to application \"Warp\")'"
      ) {
        return Promise.resolve({
          exitCode: 0,
          stdout: "/Applications/Warp.app/\n",
          stderr: ""
        });
      }
      return Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      });
    });

    await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        writeYamlFile: (path) => {
          capturedYamlPath = path;
          return Promise.resolve();
        },
        executeAttachCommand
      }
    );

    expect(executedCommands[0]).toBe("open -Ra 'Warp'");
    expect(executedCommands[1]).toBe(
      "osascript -e 'POSIX path of (path to application \"Warp\")'"
    );
    expect(executedCommands[2]).toBe(
      "plutil -extract CFBundleURLTypes json -o - '/Applications/Warp.app/Contents/Info.plist' | grep -qi '\"warp\"'"
    );
    expect(executedCommands[3]).toBe("open 'warp://launch/pf-b_attach_warp_probe'");
    expect(capturedYamlPath).toMatch(
      /\.warp\/launch_configurations\/pf-b_attach_warp_probe\.yaml$/u
    );
  });

  it("falls back to legacy iTerm probe name when canonical iTerm2 probe fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_iterm2_probe_fallback",
      repoPath: "/tmp/pairflow-attach-iterm2-probe-fallback",
      attachLauncher: "iterm2"
    });

    const executedCommands: string[] = [];
    const executeAttachCommand = vi.fn((input: { command: string }) => {
      executedCommands.push(input.command);
      if (input.command === "open -Ra 'iTerm2'") {
        return Promise.resolve({
          exitCode: 1,
          stdout: "",
          stderr: "Unable to find application named \"iTerm2\""
        });
      }
      if (input.command === "open -Ra 'iTerm'") {
        return Promise.resolve({
          exitCode: 0,
          stdout: "",
          stderr: ""
        });
      }
      return Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      });
    });

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        executeAttachCommand
      }
    );

    expect(result.launcherUsed).toBe("iterm2");
    expect(executedCommands[0]).toBe("open -Ra 'iTerm2'");
    expect(executedCommands[1]).toBe("open -Ra 'iTerm'");
    const launchScriptCommand = executedCommands[2];
    expect(launchScriptCommand).toBeDefined();
    if (launchScriptCommand === undefined) {
      return;
    }
    expect(launchScriptCommand).toContain('tell application "iTerm"');
  });

  it("uses iTerm2 launcher when explicitly requested", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_iterm2",
      repoPath: "/tmp/pairflow-attach-iterm2",
      attachLauncher: "iterm2"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    let executedCommand = "";
    const executeAttachCommand = vi.fn((input: { command: string }) => {
      executedCommand = input.command;
      return Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      });
    });

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          { iterm2: true },
          availabilityCalls
        ),
        executeAttachCommand
      }
    );

    expect(result.launcherRequested).toBe("iterm2");
    expect(result.launcherUsed).toBe("iterm2");
    expect(availabilityCalls).toEqual(["iterm2"]);
    expect(executeAttachCommand).toHaveBeenCalledTimes(1);
    expect(executedCommand).toContain('tell application "iTerm"');
  });

  it("uses Terminal launcher when explicitly requested", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_terminal",
      repoPath: "/tmp/pairflow-attach-terminal",
      attachLauncher: "terminal"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    let executedCommand = "";
    const executeAttachCommand = vi.fn((input: { command: string }) => {
      executedCommand = input.command;
      return Promise.resolve({
        exitCode: 0,
        stdout: "",
        stderr: ""
      });
    });

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          { terminal: true },
          availabilityCalls
        ),
        executeAttachCommand
      }
    );

    expect(result.launcherRequested).toBe("terminal");
    expect(result.launcherUsed).toBe("terminal");
    expect(availabilityCalls).toEqual(["terminal"]);
    expect(executeAttachCommand).toHaveBeenCalledTimes(1);
    expect(executedCommand).toContain('tell application "Terminal"');
    expect(executedCommand.indexOf("do script")).toBeGreaterThan(-1);
    expect(executedCommand.indexOf("activate")).toBeGreaterThan(-1);
    expect(executedCommand.indexOf("do script")).toBeLessThan(
      executedCommand.indexOf("activate")
    );
  });

  it("escapes AppleScript control characters in launcher command payloads", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_terminal_control_chars",
      repoPath: "/tmp/pairflow-attach\nterminal\tcontrol",
      attachLauncher: "terminal"
    });

    let executedCommand = "";
    await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: () => Promise.resolve(true),
        executeAttachCommand: (input) => {
          executedCommand = input.command;
          return Promise.resolve({
            exitCode: 0,
            stdout: "",
            stderr: ""
          });
        }
      }
    );

    expect(executedCommand).not.toContain("attach\nterminal");
    expect(executedCommand).toContain("attach\\nterminal\\tcontrol");
  });

  it("returns launcher_unavailable for explicit ghostty when availability check fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_ghostty_unavailable",
      repoPath: "/tmp/pairflow-attach-ghostty-unavailable",
      attachLauncher: "ghostty"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          checkLauncherAvailability: createAvailabilityChecker(
            { ghostty: false },
            availabilityCalls
          )
        }
      )
    ).rejects.toMatchObject({
      launcher: "ghostty",
      failureClass: "launcher_unavailable"
    } satisfies Partial<AttachBubbleError>);

    expect(availabilityCalls).toEqual(["ghostty"]);
  });

  it("returns launcher_unavailable for explicit warp when availability check fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_warp_unavailable",
      repoPath: "/tmp/pairflow-attach-warp-unavailable",
      attachLauncher: "warp"
    });

    await expect(
      attachBubble(
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
      launcher: "warp",
      failureClass: "launcher_unavailable"
    } satisfies Partial<AttachBubbleError>);
  });

  it("returns launcher_unavailable for explicit iTerm2 when availability check fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_iterm2_unavailable",
      repoPath: "/tmp/pairflow-attach-iterm2-unavailable",
      attachLauncher: "iterm2"
    });

    await expect(
      attachBubble(
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

  it("returns launcher_unavailable for explicit Terminal when availability check fails", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_terminal_unavailable",
      repoPath: "/tmp/pairflow-attach-terminal-unavailable",
      attachLauncher: "terminal"
    });

    await expect(
      attachBubble(
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
      launcher: "terminal",
      failureClass: "launcher_unavailable"
    } satisfies Partial<AttachBubbleError>);
  });

  it("returns launcher_launch_failed for explicit ghostty launch failure", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_ghostty_fail",
      repoPath: "/tmp/pairflow-attach-ghostty-fail",
      attachLauncher: "ghostty"
    });

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          checkLauncherAvailability: () => Promise.resolve(true),
          executeAttachCommand: () => Promise.resolve({
            exitCode: 1,
            stdout: "",
            stderr: "AppleScript execution failed\n"
          })
        }
      )
    ).rejects.toMatchObject({
      launcher: "ghostty",
      failureClass: "launcher_launch_failed",
      stderrExcerpt: "AppleScript execution failed"
    } satisfies Partial<AttachBubbleError>);
  });

  it("uses ghostty launcher when explicitly requested and available", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_ghostty_success",
      repoPath: "/tmp/pairflow-attach-ghostty-success",
      attachLauncher: "ghostty"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    let executedCommand = "";
    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          { ghostty: true },
          availabilityCalls
        ),
        executeAttachCommand: (input) => {
          executedCommand = input.command;
          return Promise.resolve({
            exitCode: 0,
            stdout: "",
            stderr: ""
          });
        }
      }
    );

    expect(result.launcherUsed).toBe("ghostty");
    expect(availabilityCalls).toEqual(["ghostty"]);
    expect(executedCommand).toContain("'open' '-na' 'Ghostty' '--args'");
    expect(executedCommand).toContain("tmux attach -t");
  });

  it("classifies generic launch errors as launcher_launch_failed", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_terminal_generic_failure",
      repoPath: "/tmp/pairflow-attach-terminal-generic-failure",
      attachLauncher: "terminal"
    });

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          checkLauncherAvailability: () => Promise.resolve(true),
          executeAttachCommand: () => Promise.resolve({
            exitCode: 1,
            stdout: "",
            stderr: "default profile not found in Terminal settings"
          })
        }
      )
    ).rejects.toMatchObject({
      launcher: "terminal",
      failureClass: "launcher_launch_failed"
    } satisfies Partial<AttachBubbleError>);
  });

  it("returns copy result with attach command and does not execute GUI launchers", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_copy",
      repoPath: "/tmp/pairflow-attach-copy",
      attachLauncher: "copy"
    });

    const checkLauncherAvailability = vi.fn(() => Promise.resolve(true));
    const executeAttachCommand = vi.fn(() => Promise.resolve({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability,
        executeAttachCommand
      }
    );

    expect(result).toEqual({
      bubbleId: resolved.bubbleId,
      tmuxSessionName: "pf-b_attach_copy",
      launcherRequested: "copy",
      launcherUsed: "copy",
      attachCommand: "tmux attach -t 'pf-b_attach_copy'"
    });
    expect(checkLauncherAvailability).not.toHaveBeenCalled();
    expect(executeAttachCommand).not.toHaveBeenCalled();
  });

  it("prefers bubble attach launcher override over global config", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_bubble_override",
      repoPath: "/tmp/pairflow-attach-bubble-override",
      attachLauncher: "terminal"
    });

    const loadPairflowGlobalConfig = vi.fn(() =>
      Promise.resolve({ attach_launcher: "copy" as const })
    );
    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          { terminal: true },
          []
        ),
        executeAttachCommand: () =>
          Promise.resolve({ exitCode: 0, stdout: "", stderr: "" }),
        loadPairflowGlobalConfig
      }
    );

    expect(result.launcherRequested).toBe("terminal");
    expect(result.launcherUsed).toBe("terminal");
    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
  });

  it("keeps bubble attach launcher precedence even when global config loader would fail", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_bubble_override_invalid_global",
      repoPath: "/tmp/pairflow-attach-bubble-override-invalid-global",
      attachLauncher: "copy"
    });

    const loadPairflowGlobalConfig = vi.fn(() => {
      throw new SchemaValidationError("Invalid Pairflow global config", [
        { path: "attach_launcher", message: "invalid" }
      ]);
    });

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          { terminal: true },
          []
        ),
        executeAttachCommand: () =>
          Promise.resolve({ exitCode: 0, stdout: "", stderr: "" }),
        loadPairflowGlobalConfig
      }
    );

    expect(result.launcherRequested).toBe("copy");
    expect(result.launcherUsed).toBe("copy");
    expect(result.attachCommand).toBe(
      `tmux attach -t '${result.tmuxSessionName}'`
    );
    expect(loadPairflowGlobalConfig).not.toHaveBeenCalled();
  });

  it("uses global attach launcher when bubble override is not set", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_global_fallback",
      repoPath: "/tmp/pairflow-attach-global-fallback"
    });

    const checkLauncherAvailability = vi.fn(() => Promise.resolve(true));
    const executeAttachCommand = vi.fn(() =>
      Promise.resolve({ exitCode: 0, stdout: "", stderr: "" })
    );

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability,
        executeAttachCommand,
        loadPairflowGlobalConfig: () =>
          Promise.resolve({ attach_launcher: "copy" })
      }
    );

    expect(result.launcherRequested).toBe("copy");
    expect(result.launcherUsed).toBe("copy");
    expect(result.attachCommand).toBe(
      "tmux attach -t 'pf-b_attach_global_fallback'"
    );
    expect(checkLauncherAvailability).not.toHaveBeenCalled();
    expect(executeAttachCommand).not.toHaveBeenCalled();
  });

  it("falls back to auto when neither bubble nor global attach launcher is set", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_auto_default",
      repoPath: "/tmp/pairflow-attach-auto-default"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn(() =>
      Promise.resolve({ exitCode: 0, stdout: "", stderr: "" })
    );

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          {
            iterm2: false,
            ghostty: false,
            warp: false,
            terminal: false
          },
          availabilityCalls
        ),
        executeAttachCommand,
        loadPairflowGlobalConfig: () => Promise.resolve({})
      }
    );

    expect(result.launcherRequested).toBe("auto");
    expect(result.launcherUsed).toBe("copy");
    expect(availabilityCalls).toEqual(["iterm2", "ghostty", "warp", "terminal"]);
  });

  it("auto evaluates candidates in deterministic order and picks first success", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_auto_order",
      repoPath: "/tmp/pairflow-attach-auto-order",
      attachLauncher: "auto"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn(() =>
      Promise.resolve({ exitCode: 0, stdout: "", stderr: "" })
    );

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          {
            iterm2: false,
            ghostty: false,
            warp: true,
            terminal: true
          },
          availabilityCalls
        ),
        writeYamlFile: () => Promise.resolve(),
        executeAttachCommand
      }
    );

    expect(availabilityCalls).toEqual(["iterm2", "ghostty", "warp"]);
    expect(result.launcherRequested).toBe("auto");
    expect(result.launcherUsed).toBe("warp");
    expect(executeAttachCommand).toHaveBeenCalledTimes(1);
  });

  it("auto falls back to copy when no GUI launcher is available", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_auto_copy",
      repoPath: "/tmp/pairflow-attach-auto-copy",
      attachLauncher: "auto"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn(() => Promise.resolve({
      exitCode: 0,
      stdout: "",
      stderr: ""
    }));

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          {
            iterm2: false,
            ghostty: false,
            warp: false,
            terminal: false
          },
          availabilityCalls
        ),
        executeAttachCommand
      }
    );

    expect(availabilityCalls).toEqual(["iterm2", "ghostty", "warp", "terminal"]);
    expect(result.launcherUsed).toBe("copy");
    expect(result.attachCommand).toBe("tmux attach -t 'pf-b_attach_auto_copy'");
    expect(executeAttachCommand).not.toHaveBeenCalled();
  });

  it("auto treats launcher_unavailable at launch time as skip and continues", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_auto_skip",
      repoPath: "/tmp/pairflow-attach-auto-skip",
      attachLauncher: "auto"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn((input: { command: string }) => {
      if (input.command.includes('tell application "iTerm"')) {
        return Promise.resolve({
          exitCode: 1,
          stdout: "",
          stderr: "Unable to find application named \"iTerm\""
        });
      }
      if (input.command.includes("warp://launch")) {
        return Promise.resolve({
          exitCode: 0,
          stdout: "",
          stderr: ""
        });
      }
      return Promise.resolve({
        exitCode: 1,
        stdout: "",
        stderr: "unexpected command"
      });
    });

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          {
            iterm2: true,
            ghostty: false,
            warp: true,
            terminal: false
          },
          availabilityCalls
        ),
        writeYamlFile: () => Promise.resolve(),
        executeAttachCommand
      }
    );

    expect(availabilityCalls).toEqual(["iterm2", "ghostty", "warp"]);
    expect(result.launcherUsed).toBe("warp");
  });

  it("auto treats launcher_unavailable during later candidate launch as skip and continues", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_auto_skip_later",
      repoPath: "/tmp/pairflow-attach-auto-skip-later",
      attachLauncher: "auto"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn((input: { command: string }) => {
      if (input.command.includes("Ghostty")) {
        return Promise.resolve({
          exitCode: 1,
          stdout: "",
          stderr: "No application knows how to open URL"
        });
      }
      if (input.command.includes("warp://launch")) {
        return Promise.resolve({
          exitCode: 0,
          stdout: "",
          stderr: ""
        });
      }
      return Promise.resolve({
        exitCode: 1,
        stdout: "",
        stderr: "unexpected command"
      });
    });

    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          {
            iterm2: false,
            ghostty: true,
            warp: true,
            terminal: false
          },
          availabilityCalls
        ),
        writeYamlFile: () => Promise.resolve(),
        executeAttachCommand
      }
    );

    expect(availabilityCalls).toEqual(["iterm2", "ghostty", "warp"]);
    expect(result.launcherUsed).toBe("warp");
  });

  it("auto stops on launcher_launch_failed and does not fallback further", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_auto_stop",
      repoPath: "/tmp/pairflow-attach-auto-stop",
      attachLauncher: "auto"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const executeAttachCommand = vi.fn(() => Promise.resolve({
      exitCode: 1,
      stdout: "",
      stderr: "AppleScript syntax error"
    }));

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          checkLauncherAvailability: createAvailabilityChecker(
            {
              iterm2: true,
              ghostty: true,
              warp: true,
              terminal: true
            },
            availabilityCalls
          ),
          executeAttachCommand
        }
      )
    ).rejects.toMatchObject({
      launcher: "iterm2",
      failureClass: "launcher_launch_failed"
    } satisfies Partial<AttachBubbleError>);

    expect(availabilityCalls).toEqual(["iterm2"]);
    expect(executeAttachCommand).toHaveBeenCalledTimes(1);
  });

  it("falls back to auto when global config is invalid SchemaValidationError", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_global_config_invalid_schema",
      repoPath: "/tmp/pairflow-attach-global-config-invalid-schema"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: () => Promise.resolve(true),
        checkLauncherAvailability: createAvailabilityChecker(
          {
            iterm2: false,
            ghostty: false,
            warp: false,
            terminal: false
          },
          availabilityCalls
        ),
        loadPairflowGlobalConfig: () => {
          throw new SchemaValidationError("Invalid Pairflow global config", [
            { path: "attach_launcher", message: "invalid" }
          ]);
        }
      }
    );

    expect(result.launcherRequested).toBe("auto");
    expect(result.launcherUsed).toBe("copy");
    expect(availabilityCalls).toEqual(["iterm2", "ghostty", "warp", "terminal"]);
  });

  it("wraps non-schema global config load failures as AttachBubbleError", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_global_config_error",
      repoPath: "/tmp/pairflow-attach-global-config-error"
    });

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(true),
          loadPairflowGlobalConfig: () => {
            throw new Error("Invalid Pairflow global config");
          }
        }
      )
    ).rejects.toThrow(/Failed to load global Pairflow config/u);
  });

  it("rejects when tmux session does not exist", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_no_session",
      repoPath: "/tmp/pairflow-attach-no-session"
    });

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(false)
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "TMUX_SESSION_MISSING"
    } satisfies Partial<AttachBubbleError>);

    await expect(
      attachBubble(
        {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath
        },
        {
          resolveBubbleById: () => Promise.resolve(resolved),
          checkTmuxSessionExists: () => Promise.resolve(false)
        }
      )
    ).rejects.toThrow(/Tmux session .* does not exist/u);
  });

  it("uses the hashed start-session naming contract for local attach", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "phase3f-remote-open-ui-consume",
      repoPath: "/tmp/pairflow-attach-hashed-session",
      attachLauncher: "copy"
    });

    const checkedSessionNames: string[] = [];
    const result = await attachBubble(
      {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath
      },
      {
        resolveBubbleById: () => Promise.resolve(resolved),
        checkTmuxSessionExists: (sessionName) => {
          checkedSessionNames.push(sessionName);
          return Promise.resolve(true);
        }
      }
    );

    expect(checkedSessionNames).toEqual([
      buildBubbleTmuxSessionName(resolved.bubbleId)
    ]);
    expect(result.tmuxSessionName).toBe(
      buildBubbleTmuxSessionName(resolved.bubbleId)
    );
    expect(result.attachCommand).toBe(
      `tmux attach -t '${buildBubbleTmuxSessionName(resolved.bubbleId)}'`
    );
  });

  it("fails closed with actionable guidance when remote pointer is created", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_created",
      repoPath: "/tmp/pairflow-attach-remote-created"
    });

    await expect(
      attachBubble(
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
            kind: "created",
            host: "ssh.example.com",
            portForwards: [3000]
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "REMOTE_ATTACH_START_REQUIRED"
    } satisfies Partial<AttachBubbleError>);
  });

  it("builds remote ssh attach command from started pointer authority", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_started",
      repoPath: "/tmp/pairflow-attach-remote-started",
      attachLauncher: "copy"
    });

    const result = await attachBubble(
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
          instanceId: "remote-instance-01",
          remoteClonePath: "/srv/pairflow/repo--b_attach_remote_started",
          tmuxSession: "pf-remote-b_attach_remote_started",
          startedAt: "2026-04-17T10:00:00.000Z",
          portForwards: [5173, 3000]
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

    expect(result).toEqual({
      bubbleId: "b_attach_remote_started",
      tmuxSessionName: "pf-remote-b_attach_remote_started",
      launcherRequested: "copy",
      launcherUsed: "copy",
      attachCommand:
        "'ssh' '-o' 'BatchMode=yes' '-o' 'StrictHostKeyChecking=yes' '-o' 'ConnectTimeout=10' '-o' 'ConnectionAttempts=1' '-L' '127.0.0.1:3000:127.0.0.1:3000' '-L' '127.0.0.1:5173:127.0.0.1:5173' '-t' 'dev@ssh.example.com' 'bash' '-lc' 'cd '\\''/srv/pairflow/repo--b_attach_remote_started'\\'' && tmux attach -t '\\''pf-remote-b_attach_remote_started'\\'''"
    });
  });

  it("prefers explicit CLI port forwards over persisted pointer defaults for remote attach", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_ports",
      repoPath: "/tmp/pairflow-attach-remote-ports",
      attachLauncher: "copy"
    });

    const result = await attachBubble(
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
          instanceId: "remote-instance-02",
          remoteClonePath: "/srv/pairflow/repo--b_attach_remote_ports",
          tmuxSession: "pf-remote-b_attach_remote_ports",
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

  it("keeps started-pointer attach authority when matching remote alias is missing from global config", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_missing_alias",
      repoPath: "/tmp/pairflow-attach-remote-missing-alias",
      attachLauncher: "copy"
    });

    const result = await attachBubble(
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
          instanceId: "remote-instance-missing-alias",
          remoteClonePath: "/srv/pairflow/repo--b_attach_remote_missing_alias",
          tmuxSession: "pf-remote-b_attach_remote_missing_alias",
          startedAt: "2026-04-17T10:00:00.000Z"
        }),
        loadPairflowGlobalConfig: () => Promise.resolve({
          remotes: {}
        })
      }
    );

    expect(result.attachCommand).toContain("'pointer-user@ssh.example.com'");
    expect(result.attachCommand).toContain(
      "/srv/pairflow/repo--b_attach_remote_missing_alias"
    );
  });

  it("returns config-invalid when started remote pointer is paired with a non-ssh executor", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_non_ssh_executor",
      repoPath: "/tmp/pairflow-attach-remote-non-ssh-executor",
      attachLauncher: "copy"
    });

    await expect(
      attachBubble(
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
            instanceId: "remote-instance-non-ssh",
            remoteClonePath: "/srv/pairflow/repo--b_attach_remote_non_ssh_executor",
            tmuxSession: "pf-remote-b_attach_remote_non_ssh_executor",
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
      bubbleId: "b_attach_remote_config_supplement_failed",
      repoPath: "/tmp/pairflow-attach-remote-config-supplement-failed",
      attachLauncher: "copy"
    });

    const result = await attachBubble(
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
          instanceId: "remote-instance-config-supplement",
          remoteClonePath: "/srv/pairflow/repo--b_attach_remote_config_supplement_failed",
          tmuxSession: "pf-remote-b_attach_remote_config_supplement_failed",
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
      bubbleId: "b_attach_remote_default_launcher_on_config_error",
      repoPath: "/tmp/pairflow-attach-remote-default-launcher-on-config-error"
    });

    const availabilityCalls: LauncherAvailabilityInput["launcher"][] = [];
    const result = await attachBubble(
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
          instanceId: "remote-instance-default-launcher",
          remoteClonePath: "/srv/pairflow/repo--b_attach_remote_default_launcher_on_config_error",
          tmuxSession: "pf-remote-b_attach_remote_default_launcher_on_config_error",
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

  it("fails closed with start-required when ssh bubble has no remote pointer yet", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_null_pointer",
      repoPath: "/tmp/pairflow-attach-remote-null-pointer",
      attachLauncher: "copy"
    });

    await expect(
      attachBubble(
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

  it("fails closed when remote pointer read is malformed", async () => {
    const resolved = createResolvedBubbleFixture({
      bubbleId: "b_attach_remote_pointer_invalid",
      repoPath: "/tmp/pairflow-attach-remote-pointer-invalid",
      attachLauncher: "copy"
    });

    await expect(
      attachBubble(
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
});
