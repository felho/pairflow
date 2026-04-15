import type { RuntimeSessionRecord } from "../../shared/ports/runtimeSessions.js";
import type {
  WorkspaceKind,
  WorktreeBootstrapResult
} from "../../shared/ports/worktreeWorkspace.js";
import {
  resolveRuntimeSessionWorkspaceAuthority
} from "../../shared/runtimeSessionWorkspaceAuthority.js";
import { createStartBubbleError } from "./startCommandRuntime.js";

export interface StartLaunchWorkspace {
  workspacePath: string;
  workspaceKind: WorkspaceKind;
}

function requireLaunchWorkspacePath(input: {
  bubbleId: string;
  workspacePath: string | undefined;
  workspaceKind: WorkspaceKind | undefined;
  source: "bootstrap_result" | "runtime_session";
}): StartLaunchWorkspace {
  const workspacePath = input.workspacePath?.trim();
  if ((workspacePath?.length ?? 0) === 0 || input.workspaceKind === undefined) {
    throw createStartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        input.source === "bootstrap_result"
          ? `Bubble ${input.bubbleId} cannot launch tmux because canonical workspace authority is missing from the bootstrap result.`
          : `Bubble ${input.bubbleId} cannot resume tmux because runtime session canonical workspace authority is missing.`,
      context: {
        bubble_id: input.bubbleId,
        authority_source: input.source,
        has_workspace_path: workspacePath !== undefined && workspacePath.length > 0,
        has_workspace_kind: input.workspaceKind !== undefined
      }
    });
  }
  const resolvedWorkspacePath = workspacePath!;
  const workspaceKind = input.workspaceKind;

  return {
    workspacePath: resolvedWorkspacePath,
    workspaceKind
  };
}

export function resolveFreshLaunchWorkspace(input: {
  bubbleId: string;
  bootstrapResult: WorktreeBootstrapResult;
}): StartLaunchWorkspace {
  return requireLaunchWorkspacePath({
    bubbleId: input.bubbleId,
    workspacePath: input.bootstrapResult.workspacePath,
    workspaceKind: input.bootstrapResult.workspaceKind,
    source: "bootstrap_result"
  });
}

export function resolveResumeLaunchWorkspace(input: {
  bubbleId: string;
  runtimeSessionRecord: RuntimeSessionRecord | undefined;
}): StartLaunchWorkspace {
  const resolution = resolveRuntimeSessionWorkspaceAuthority({
    runtimeSessionRecord: input.runtimeSessionRecord
  });
  if (resolution.status !== "resolved") {
    throw createStartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        `Bubble ${input.bubbleId} cannot resume tmux because runtime session canonical workspace authority is missing.`,
      context: {
        bubble_id: input.bubbleId,
        authority_source: "runtime_session",
        authority_resolution: resolution.reason
      }
    });
  }
  return requireLaunchWorkspacePath({
    bubbleId: input.bubbleId,
    workspacePath: resolution.authority.workspacePath,
    workspaceKind: resolution.authority.workspaceKind,
    source: "runtime_session"
  });
}
