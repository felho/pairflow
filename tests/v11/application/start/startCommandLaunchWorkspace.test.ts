import { describe, expect, it } from "vitest";

import {
  resolveFreshLaunchWorkspace,
  resolveResumeLaunchWorkspace
} from "../../../../src/v11/application/start/internal/runtime/startCommandLaunchWorkspace.js";
import { StartBubbleError } from "../../../../src/v11/application/start/internal/runtime/startCommandRuntime.js";

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

  it("accepts clone bootstrap workspace authority when canonical authority is explicit", () => {
    expect(resolveFreshLaunchWorkspace({
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
    })).toEqual({
      workspacePath: "/clones/bubble",
      workspaceKind: "clone"
    });
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

  it("accepts clone runtime session workspace authority when canonical authority is persisted", () => {
    expect(resolveResumeLaunchWorkspace({
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
    })).toEqual({
      workspacePath: "/clones/bubble",
      workspaceKind: "clone"
    });
  });

  it("keeps explicit clone workspaceKind even when workspacePath matches worktreePath", () => {
    expect(resolveResumeLaunchWorkspace({
      bubbleId: "b_start_launch_workspace_explicit_clone_same_path",
      runtimeSessionRecord: {
        bubbleId: "b_start_launch_workspace_explicit_clone_same_path",
        repoPath: "/repo",
        worktreePath: "/workspaces/bubble",
        workspacePath: "/workspaces/bubble",
        workspaceKind: "clone",
        tmuxSessionName: "pf-b_start_launch_workspace_explicit_clone_same_path",
        updatedAt: "2026-04-12T23:00:00.000Z"
      }
    })).toEqual({
      workspacePath: "/workspaces/bubble",
      workspaceKind: "clone"
    });
  });

  it("fails closed when runtime session workspacePath matches worktreePath but workspaceKind is missing", () => {
    expect(() =>
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_same_path_missing_kind",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_same_path_missing_kind",
          repoPath: "/repo",
          worktreePath: "/workspaces/bubble",
          workspacePath: "/workspaces/bubble",
          tmuxSessionName: "pf-b_start_launch_workspace_same_path_missing_kind",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      })
    ).toThrow(StartBubbleError);
  });

  it("fails closed when runtime session workspacePath differs from worktreePath and workspaceKind is missing", () => {
    expect(() =>
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_missing_kind_clone",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_missing_kind_clone",
          repoPath: "/repo",
          worktreePath: "/workspaces/bubble",
          workspacePath: "/clones/bubble",
          tmuxSessionName: "pf-b_start_launch_workspace_missing_kind_clone",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      })
    ).toThrow(StartBubbleError);
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
        "runtime session canonical workspace authority is missing"
      );
    }
  });

  it("fails closed when pre-migration runtime session fields are missing", () => {
    expect(() =>
      resolveResumeLaunchWorkspace({
        bubbleId: "b_start_launch_workspace_legacy",
        runtimeSessionRecord: {
          bubbleId: "b_start_launch_workspace_legacy",
          repoPath: "/repo",
          worktreePath: "/worktrees/bubble",
          tmuxSessionName: "pf-b_start_launch_workspace_legacy",
          updatedAt: "2026-04-12T23:00:00.000Z"
        }
      })
    ).toThrow(StartBubbleError);
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
