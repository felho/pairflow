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
});
