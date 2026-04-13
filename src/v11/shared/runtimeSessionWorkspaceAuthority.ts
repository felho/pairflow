import type { RuntimeSessionRecord } from "./ports/runtimeSessions.js";
import type { WorkspaceKind } from "./ports/worktreeWorkspace.js";

export interface RuntimeSessionWorkspaceAuthority {
  workspacePath: string;
  workspaceKind: WorkspaceKind;
  source: "workspace_path" | "legacy_worktree_fallback";
}

export type RuntimeSessionWorkspaceAuthorityResolution =
  | {
    status: "resolved";
    authority: RuntimeSessionWorkspaceAuthority;
  }
  | {
    status: "unresolved";
    reason:
      | "runtime_session_missing"
      | "workspace_authority_missing"
      | "legacy_clone_fallback_forbidden";
  };

function inferWorkspaceKindFromPaths(input: {
  workspacePath: string;
  worktreePath: string;
}): WorkspaceKind {
  return input.workspacePath === input.worktreePath ? "worktree" : "clone";
}

export function resolveRuntimeSessionWorkspaceAuthority(input: {
  runtimeSessionRecord: RuntimeSessionRecord | undefined;
}): RuntimeSessionWorkspaceAuthorityResolution {
  const runtimeSessionRecord = input.runtimeSessionRecord;
  if (runtimeSessionRecord === undefined) {
    return {
      status: "unresolved",
      reason: "runtime_session_missing"
    };
  }

  const worktreePath = runtimeSessionRecord.worktreePath.trim();
  const workspacePath = runtimeSessionRecord.workspacePath?.trim();

  if ((workspacePath?.length ?? 0) > 0) {
    return {
      status: "resolved",
      authority: {
        workspacePath: workspacePath!,
        workspaceKind:
          runtimeSessionRecord.workspaceKind
          ?? inferWorkspaceKindFromPaths({
            workspacePath: workspacePath!,
            worktreePath
          }),
        source: "workspace_path"
      }
    };
  }

  if (runtimeSessionRecord.workspaceKind === "clone") {
    return {
      status: "unresolved",
      reason: "legacy_clone_fallback_forbidden"
    };
  }

  if (worktreePath.length === 0) {
    return {
      status: "unresolved",
      reason: "workspace_authority_missing"
    };
  }

  return {
    status: "resolved",
    authority: {
      workspacePath: worktreePath,
      workspaceKind: "worktree",
      source: "legacy_worktree_fallback"
    }
  };
}
