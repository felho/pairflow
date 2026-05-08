import type { ResolvedTaskInput } from "../runtime/createCommandContract.js";

export function renderTaskArtifact(task: ResolvedTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : task.source === "ideation_placeholder"
        ? "Source: ideation placeholder (kickoff required before implementation)"
        : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

export function buildIdeationPlaceholderTaskContent(bubbleId: string): string {
  return [
    "## Ideation Placeholder",
    "",
    "This bubble was created with `--ideation`; there is no active implementation task yet.",
    "Run kickoff before implementation handoff:",
    `- pairflow bubble kickoff --id ${bubbleId} --task "<task text>"`,
    `- pairflow bubble kickoff --id ${bubbleId} --task-file <path>`,
    "",
    "metadata_source: ideation_placeholder"
  ].join("\n");
}
