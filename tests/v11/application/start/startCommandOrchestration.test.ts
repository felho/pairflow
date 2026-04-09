import { describe, expect, it, vi } from "vitest";

import { buildResumeTranscriptSummary } from "../../../../src/v11/application/start/startCommandResumeSummary.js";
import {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "../../../../src/v11/infrastructure/workspace/worktreeManager.js";
import {
  launchBubbleTmuxSession,
  terminateBubbleTmuxSession
} from "../../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import {
  claimRuntimeSession,
  removeRuntimeSession
} from "../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { StartBubbleError } from "../../../../src/v11/application/start/startCommandRuntime.js";
import {
  mapStartBubbleResult,
  resolveStartBubbleDependencies,
  resolveStartBubbleMode
} from "../../../../src/v11/application/start/startCommandOrchestration.js";

describe("startCommandOrchestration", () => {
  it("resolves default dependencies when no override is provided", async () => {
    const runWorktreeBootstrapCommandDefault = vi.fn(async () => undefined);
    const isTmuxSessionAliveDefault = vi.fn(async () => false);

    const resolved = await resolveStartBubbleDependencies({
      dependencies: {},
      runWorktreeBootstrapCommandDefault,
      isTmuxSessionAliveDefault
    });

    expect(resolved.bootstrap).toBe(bootstrapWorktreeWorkspace);
    expect(resolved.cleanup).toBe(cleanupWorktreeWorkspace);
    expect(resolved.runWorktreeBootstrapCommand).toBe(runWorktreeBootstrapCommandDefault);
    expect(resolved.launchTmux).toBe(launchBubbleTmuxSession);
    expect(resolved.terminateTmux).toBe(terminateBubbleTmuxSession);
    expect(resolved.isTmuxSessionAlive).toBe(isTmuxSessionAliveDefault);
    expect(resolved.claimSession).toBe(claimRuntimeSession);
    expect(resolved.removeSession).toBe(removeRuntimeSession);
    expect(resolved.buildResumeSummary).toBe(buildResumeTranscriptSummary);
  });

  it("prefers explicit dependency overrides", async () => {
    const overrides = {
      bootstrapWorktreeWorkspace: vi.fn(async () => ({
        repoPath: "repo",
        baseRef: "refs/heads/main",
        bubbleBranch: "bubble",
        worktreePath: "worktree"
      })),
      cleanupWorktreeWorkspace: vi.fn(async () => ({
        repoPath: "repo",
        bubbleBranch: "bubble",
        worktreePath: "worktree",
        removedWorktree: false,
        removedBranch: false
      })),
      runWorktreeBootstrapCommand: vi.fn(async () => undefined),
      launchBubbleTmuxSession: vi.fn(async () => ({
        sessionName: "pf-bubble"
      })),
      terminateBubbleTmuxSession: vi.fn(async () => ({
        sessionName: "pf-bubble",
        existed: true
      })),
      isTmuxSessionAlive: vi.fn(async () => true),
      claimRuntimeSession: vi.fn(async () => ({
        claimed: true,
        record: {
          bubbleId: "bubble",
          repoPath: "repo",
          worktreePath: "worktree",
          tmuxSessionName: "pf-bubble",
          updatedAt: "2026-03-19T00:00:00.000Z"
        }
      })),
      removeRuntimeSession: vi.fn(async () => true),
      buildResumeTranscriptSummary: vi.fn(async () => "summary")
    };

    const fallbackRunWorktreeBootstrapCommand = vi.fn(async () => undefined);
    const fallbackIsTmuxSessionAlive = vi.fn(async () => false);

    const resolved = await resolveStartBubbleDependencies({
      dependencies: overrides,
      runWorktreeBootstrapCommandDefault: fallbackRunWorktreeBootstrapCommand,
      isTmuxSessionAliveDefault: fallbackIsTmuxSessionAlive
    });

    expect(resolved.bootstrap).toBe(overrides.bootstrapWorktreeWorkspace);
    expect(resolved.cleanup).toBe(overrides.cleanupWorktreeWorkspace);
    expect(resolved.runWorktreeBootstrapCommand).toBe(overrides.runWorktreeBootstrapCommand);
    expect(resolved.launchTmux).toBe(overrides.launchBubbleTmuxSession);
    expect(resolved.terminateTmux).toBe(overrides.terminateBubbleTmuxSession);
    expect(resolved.isTmuxSessionAlive).toBe(overrides.isTmuxSessionAlive);
    expect(resolved.claimSession).toBe(overrides.claimRuntimeSession);
    expect(resolved.removeSession).toBe(overrides.removeRuntimeSession);
    expect(resolved.buildResumeSummary).toBe(overrides.buildResumeTranscriptSummary);
  });

  it("routes CREATED to fresh and runtime states to resume", () => {
    expect(resolveStartBubbleMode("CREATED")).toBe("fresh");
    expect(resolveStartBubbleMode("RUNNING")).toBe("resume");
    expect(resolveStartBubbleMode("COMMITTED")).toBe("resume");
  });

  it("throws StartBubbleError for unsupported states", () => {
    expect(() => resolveStartBubbleMode("FAILED")).toThrow(StartBubbleError);
    expect(() => resolveStartBubbleMode("FAILED")).toThrow(
      "bubble start requires state CREATED or resumable runtime state (current: FAILED)."
    );
  });

  it("maps final start result shape", () => {
    const state = {
      state: "RUNNING",
      round: 1
    } as never;

    const result = mapStartBubbleResult({
      bubbleId: "b_start_01",
      state,
      tmuxSessionName: "pf-b_start_01",
      worktreePath: "/tmp/worktree"
    });

    expect(result).toEqual({
      bubbleId: "b_start_01",
      state,
      tmuxSessionName: "pf-b_start_01",
      worktreePath: "/tmp/worktree"
    });
  });
});
