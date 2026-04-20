import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

interface ApprovalExecutionPathIdentity {
  absolutePath: string;
  canonicalPath: string;
}

export interface RequestReworkRemoteFallbackDiagnostic {
  reasonCode: "verified_remote_clone_root_required";
  workspaceRepoPath: string;
  workspaceRootPath: string;
}

async function resolveApprovalExecutionPathIdentity(
  pathValue: string
): Promise<ApprovalExecutionPathIdentity> {
  const absolutePath = resolve(pathValue);
  return {
    absolutePath,
    canonicalPath: await realpath(absolutePath).catch(() => absolutePath)
  };
}

function approvalExecutionPathsMatch(
  left: ApprovalExecutionPathIdentity,
  right: ApprovalExecutionPathIdentity
): boolean {
  return (
    left.absolutePath === right.absolutePath
    || left.canonicalPath === right.canonicalPath
  );
}

export function isWorkspaceResolutionReason(
  error: unknown,
  reason: string
): boolean {
  if (typeof error !== "object" || error === null || !("context" in error)) {
    return false;
  }

  const context = error.context;
  return (
    typeof context === "object"
    && context !== null
    && "reason" in context
    && context.reason === reason
  );
}

export async function resolveRequestReworkExecutionPathIdentities(input: {
  resolvedRepoPath: string;
  workspaceRepoPath: string;
  workspaceRootPath: string;
}): Promise<{
  resolvedRepoPathIdentity: ApprovalExecutionPathIdentity;
  workspaceRepoPathIdentity: ApprovalExecutionPathIdentity;
  workspaceRootIdentity: ApprovalExecutionPathIdentity;
}> {
  const [
    resolvedRepoPathIdentity,
    workspaceRepoPathIdentity,
    workspaceRootIdentity
  ] = await Promise.all([
    resolveApprovalExecutionPathIdentity(input.resolvedRepoPath),
    resolveApprovalExecutionPathIdentity(input.workspaceRepoPath),
    resolveApprovalExecutionPathIdentity(input.workspaceRootPath)
  ]);

  return {
    resolvedRepoPathIdentity,
    workspaceRepoPathIdentity,
    workspaceRootIdentity
  };
}

export function workspaceRepoMatchesResolvedRepo(input: {
  resolvedRepoPathIdentity: ApprovalExecutionPathIdentity;
  workspaceRepoPathIdentity: ApprovalExecutionPathIdentity;
}): boolean {
  return approvalExecutionPathsMatch(
    input.workspaceRepoPathIdentity,
    input.resolvedRepoPathIdentity
  );
}

export function resolveCloneRootFallbackDiagnostic(input: {
  workspaceRepoPathIdentity: ApprovalExecutionPathIdentity;
  workspaceRootIdentity: ApprovalExecutionPathIdentity;
}): RequestReworkRemoteFallbackDiagnostic | undefined {
  if (
    approvalExecutionPathsMatch(
      input.workspaceRootIdentity,
      input.workspaceRepoPathIdentity
    )
  ) {
    return undefined;
  }

  return {
    reasonCode: "verified_remote_clone_root_required",
    workspaceRepoPath: input.workspaceRepoPathIdentity.absolutePath,
    workspaceRootPath: input.workspaceRootIdentity.absolutePath
  };
}
