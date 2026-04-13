import { describe, expect, it } from "vitest";

import {
  resolveFreshLaunchWorkspace,
  resolveResumeLaunchWorkspace
} from "../../../../src/v11/application/start/startCommandLaunchWorkspace.js";
import { StartBubbleError } from "../../../../src/v11/application/start/startCommandRuntime.js";

describe("startCommandLaunchWorkspace", () => {
  it("prefers explicit bootstrap workspace authority when present for worktree mode", () => {
    expect(resolveFreshLaunchWorkspace({
      bubbleId: "b_start_launch_workspace_fresh_explicit",
      bootstrapResult: {
        repoPath: "/repo",
        baseRef: "refs/heads/main",
        bubbleBranch: "bubble/b_start_launch_workspace_fresh_explicit",
        worktreePath: "/worktrees/bubble",
        workspacePath: "/worktrees/bubble-canonical",
        workspaceKind: "worktree",
        branchPrepared: true
      }
    })).toEqual({
      workspacePath: "/worktrees/bubble-canonical",
      workspaceKind: "worktree"
    });
  });

  it("rejects clone bootstrap workspace authority until clone start is activated", () => {
    expect(() =>
      resolveFreshLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_fresh_clone",
        bootstrapResult: {
          repoPath: "/repo",
          baseRef: "refs/heads/main",
          bubbleBranch: "bubble/b_start_launch_workspace_fresh_clone",
          worktreePath: "/worktrees/bubble",
          workspacePath: "/clones/bubble",
          workspaceKind: "clone",
          branchPrepared: true
        }
      })
    ).toThrow(StartBubbleError);

    try {
      resolveFreshLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_fresh_clone",
        bootstrapResult: {
          repoPath: "/repo",
          baseRef: "refs/heads/main",
          bubbleBranch: "bubble/b_start_launch_workspace_fresh_clone",
          worktreePath: "/worktrees/bubble",
          workspacePath: "/clones/bubble",
          workspaceKind: "clone",
          branchPrepared: true
        }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(StartBubbleError);
      expect((error as StartBubbleError).reasonCode).toBe(
        "WORKSPACE_MODE_CLONE_NOT_ACTIVATED"
      );
    }
  });

  it("fails closed when bootstrap workspacePath authority is missing even when worktreePath exists", () => {
    expect(() =>
      resolveFreshLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_fresh_missing",
        bootstrapResult: {
          repoPath: "/repo",
          baseRef: "refs/heads/main",
          bubbleBranch: "bubble/b_start_launch_workspace_fresh_missing",
          worktreePath: "/worktrees/bubble",
          workspacePath: undefined as never,
          workspaceKind: "worktree",
          branchPrepared: true
        }
      })
    ).toThrow(StartBubbleError);

    try {
      resolveFreshLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_fresh_missing",
        bootstrapResult: {
          repoPath: "/repo",
          baseRef: "refs/heads/main",
          bubbleBranch: "bubble/b_start_launch_workspace_fresh_missing",
          worktreePath: "/worktrees/bubble",
          workspacePath: undefined as never,
          workspaceKind: "worktree",
          branchPrepared: true
        }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(StartBubbleError);
      expect((error as StartBubbleError).reasonCode).toBe(
        "START_LAUNCH_WORKSPACE_UNAVAILABLE"
      );
    }
  });

  it("uses explicit runtime session workspace authority when present for worktree mode", () => {
    expect(resolveResumeLaunchWorkspace({
      bubbleId: "b_start_launch_workspace_explicit",
      runtimeSessionRecord: {
        bubbleId: "b_start_launch_workspace_explicit",
        repoPath: "/repo",
        worktreePath: "/worktrees/bubble",
        workspacePath: "/worktrees/bubble-canonical",
        workspaceKind: "worktree",
        tmuxSessionName: "pf-b_start_launch_workspace_explicit",
        updatedAt: "2026-04-12T23:00:00.000Z"
      }
    })).toEqual({
      workspacePath: "/worktrees/bubble-canonical",
      workspaceKind: "worktree"
    });
  });

  it("rejects clone runtime session workspace authority until clone resume is activated", () => {
    expect(() =>
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_explicit_clone",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_explicit_clone",
          repoPath: "/repo",
          worktreePath: "/worktrees/bubble",
          workspacePath: "/clones/bubble",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_start_launch_workspace_explicit_clone",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      })
    ).toThrow(StartBubbleError);

    try {
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_explicit_clone",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_explicit_clone",
          repoPath: "/repo",
          worktreePath: "/worktrees/bubble",
          workspacePath: "/clones/bubble",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_start_launch_workspace_explicit_clone",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(StartBubbleError);
      expect((error as StartBubbleError).reasonCode).toBe(
        "WORKSPACE_MODE_CLONE_NOT_ACTIVATED"
      );
    }
  });

  it("fails closed when runtime session kept only clone-mode worktree fallback without workspacePath", () => {
    expect(() =>
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_clone_fallback_forbidden",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_clone_fallback_forbidden",
          repoPath: "/repo",
          worktreePath: "/worktrees/bubble",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_start_launch_workspace_clone_fallback_forbidden",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      })
    ).toThrow(StartBubbleError);

    try {
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_clone_fallback_forbidden",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_clone_fallback_forbidden",
          repoPath: "/repo",
          worktreePath: "/worktrees/bubble",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_start_launch_workspace_clone_fallback_forbidden",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(StartBubbleError);
      expect((error as StartBubbleError).reasonCode).toBe(
        "START_LAUNCH_WORKSPACE_UNAVAILABLE"
      );
      expect((error as Error).message).toContain(
        "clone-mode worktree reference without canonical workspace authority"
      );
    }
  });

  it("falls back to legacy worktree authority when pre-migration runtime session fields are missing", () => {
    expect(resolveResumeLaunchWorkspace({
      bubbleId: "b_start_launch_workspace_legacy",
      runtimeSessionRecord: {
        bubbleId: "b_start_launch_workspace_legacy",
        repoPath: "/repo",
        worktreePath: "/worktrees/bubble",
        tmuxSessionName: "pf-b_start_launch_workspace_legacy",
        updatedAt: "2026-04-12T23:00:00.000Z"
      }
    })).toEqual({
      workspacePath: "/worktrees/bubble",
      workspaceKind: "worktree"
    });
  });

  it("fails closed when runtime session workspace authority is empty", () => {
    expect(() =>
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_runtime_missing",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_runtime_missing",
          repoPath: "/repo",
          worktreePath: "   ",
          tmuxSessionName: "pf-b_start_launch_workspace_runtime_missing",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      })
    ).toThrow(StartBubbleError);
  });
});
