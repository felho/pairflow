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

  it("fails closed when canonical workspace path is present but workspaceKind is missing", () => {
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
      status: "unresolved",
      reason: "workspace_authority_missing"
    });
  });

  it("fails closed when canonical workspace path differs from the retained worktree path but workspaceKind is missing", () => {
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
      status: "unresolved",
      reason: "workspace_authority_missing"
    });
  });

  it("fails closed when explicit workspace authority is absent", () => {
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
      status: "unresolved",
      reason: "workspace_authority_missing"
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

  it("fails closed when workspaceKind is clone but canonical workspace authority is absent", () => {
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
      reason: "workspace_authority_missing"
    });
  });
});
