import { describe, expect, it } from "vitest";

import { resolveRuntimeSessionWorkspaceAuthority } from "../../../src/v11/shared/runtimeSessionWorkspaceAuthority.js";

describe("resolveRuntimeSessionWorkspaceAuthority", () => {
  it("reports runtime_session_missing when runtime session record is absent", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: undefined
    });

    expect(result).toEqual({
      status: "unresolved",
      reason: "runtime_session_missing"
    });
  });

  it("resolves explicit canonical workspace authority", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: {
        bubbleId: "b_runtime_authority_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        workspacePath: "/tmp/runtime-workspace",
        workspaceKind: "worktree",
        tmuxSessionName: "pf-b_runtime_authority_01",
        updatedAt: "2026-04-13T10:00:00.000Z"
      }
    });

    expect(result).toEqual({
      status: "resolved",
      authority: {
        workspacePath: "/tmp/runtime-workspace",
        workspaceKind: "worktree",
        source: "workspace_path"
      }
    });
  });

  it("infers worktree workspace kind when canonical workspace path matches the retained worktree path", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: {
        bubbleId: "b_runtime_authority_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/runtime-workspace",
        workspacePath: "/tmp/runtime-workspace",
        tmuxSessionName: "pf-b_runtime_authority_01",
        updatedAt: "2026-04-13T10:00:00.000Z"
      }
    });

    expect(result).toEqual({
      status: "resolved",
      authority: {
        workspacePath: "/tmp/runtime-workspace",
        workspaceKind: "worktree",
        source: "workspace_path"
      }
    });
  });

  it("infers clone workspace kind when canonical workspace path differs from the retained worktree path", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: {
        bubbleId: "b_runtime_authority_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        workspacePath: "/tmp/runtime-workspace",
        tmuxSessionName: "pf-b_runtime_authority_01",
        updatedAt: "2026-04-13T10:00:00.000Z"
      }
    });

    expect(result).toEqual({
      status: "resolved",
      authority: {
        workspacePath: "/tmp/runtime-workspace",
        workspaceKind: "clone",
        source: "workspace_path"
      }
    });
  });

  it("resolves legacy worktree no-split authority when explicit workspace authority is absent", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: {
        bubbleId: "b_runtime_authority_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-b_runtime_authority_01",
        updatedAt: "2026-04-13T10:00:00.000Z"
      }
    });

    expect(result).toEqual({
      status: "resolved",
      authority: {
        workspacePath: "/tmp/worktree",
        workspaceKind: "worktree",
        source: "legacy_worktree_fallback"
      }
    });
  });

  it("reports missing workspace authority when neither canonical nor legacy no-split authority is present", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: {
        bubbleId: "b_runtime_authority_01",
        repoPath: "/tmp/repo",
        worktreePath: "   ",
        tmuxSessionName: "pf-b_runtime_authority_01",
        updatedAt: "2026-04-13T10:00:00.000Z"
      }
    });

    expect(result).toEqual({
      status: "unresolved",
      reason: "workspace_authority_missing"
    });
  });

  it("forbids clone-only legacy worktree fallback without canonical workspace authority", () => {
    const result = resolveRuntimeSessionWorkspaceAuthority({
      runtimeSessionRecord: {
        bubbleId: "b_runtime_authority_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        workspaceKind: "clone",
        tmuxSessionName: "pf-b_runtime_authority_01",
        updatedAt: "2026-04-13T10:00:00.000Z"
      }
    });

    expect(result).toEqual({
      status: "unresolved",
      reason: "legacy_clone_fallback_forbidden"
    });
  });
});
