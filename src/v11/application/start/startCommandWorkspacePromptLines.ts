const noSplitLaunchWorkspaceLabel = "Phase 1C1 no-split worktree root";

export function buildLaunchWorkspaceCommandScopeLine(
  workspacePath: string
): string {
  return `Execute pairflow commands from this launch workspace path only (${noSplitLaunchWorkspaceLabel}): ${workspacePath}.`;
}

export function buildRepositoryLaunchWorkspaceLine(input: {
  repoPath: string;
  workspacePath: string;
}): string {
  return `Repository: ${input.repoPath}. Launch workspace (${noSplitLaunchWorkspaceLabel}): ${input.workspacePath}.`;
}

export function buildRepoLaunchWorkspaceTaskLine(input: {
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
}): string {
  return `Repo: ${input.repoPath}. Launch workspace (${noSplitLaunchWorkspaceLabel}): ${input.workspacePath}. Task: ${input.taskArtifactPath}.`;
}
