interface KickoffResolveBubbleInputFields {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}

export function buildKickoffResolveBubbleInput(
  input: KickoffResolveBubbleInputFields
): KickoffResolveBubbleInputFields {
  return {
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  };
}

interface KickoffTaskResolutionInputFields {
  task?: string;
  taskFile?: string;
  cwd?: string;
}

export function buildKickoffTaskResolutionInput(
  input: KickoffTaskResolutionInputFields
): { task?: string; taskFile?: string; cwd: string } {
  return {
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    cwd: input.cwd ?? process.cwd()
  };
}
