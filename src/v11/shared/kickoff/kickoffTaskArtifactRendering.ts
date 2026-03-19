interface KickoffTaskArtifactInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

function renderKickoffTaskSourceLine(task: KickoffTaskArtifactInput): string {
  return task.source === "file"
    ? `Source: file (${task.sourcePath})`
    : "Source: inline text";
}

export function renderKickoffTaskArtifactFromInput(
  task: KickoffTaskArtifactInput
): string {
  return `# Bubble Task\n\n${renderKickoffTaskSourceLine(task)}\n\n${task.content}\n`;
}
