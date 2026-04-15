import type { RuntimeSessionRecord } from "./ports/runtimeSessions.js";
import type { WorkspaceKind } from "./ports/worktreeWorkspace.js";

export interface RuntimeSessionWorkspaceAuthority {
  workspacePath: string;
  workspaceKind: WorkspaceKind;
  source: "workspace_path";
}

export type RuntimeSessionWorkspaceAuthorityResolution =
  | {
    status: "resolved";
    authority: RuntimeSessionWorkspaceAuthority;
  }
  | {
    status: "unresolved";
    reason: "runtime_session_missing" | "workspace_authority_missing";
  };

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

  const workspacePath = runtimeSessionRecord.workspacePath?.trim();
  if ((workspacePath?.length ?? 0) === 0 || runtimeSessionRecord.workspaceKind === undefined) {
    return {
      status: "unresolved",
      reason: "workspace_authority_missing"
    };
  }

  return {
    status: "resolved",
    authority: {
      workspacePath: workspacePath!,
      workspaceKind: runtimeSessionRecord.workspaceKind,
      source: "workspace_path"
    }
  };
}
