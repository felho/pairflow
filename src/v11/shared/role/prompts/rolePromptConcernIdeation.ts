import {
  buildRepositoryLaunchWorkspaceLine,
} from "./workspacePromptLines.js";
import { buildResumeContextLine } from "./resumePromptShared.js";
import type {
  PromptConcernBuildInput,
  ResumePromptConcernBuildInput,
  StartupPromptConcernBuildInput
} from "./rolePromptConcernTypes.js";

export function isResumePromptConcernBuildInput(
  input: PromptConcernBuildInput
): input is ResumePromptConcernBuildInput {
  return input.state !== undefined;
}

export function isStartupPromptConcernBuildInput(
  input: PromptConcernBuildInput
): input is StartupPromptConcernBuildInput {
  return input.state === undefined;
}

export function isIdeationPendingImplementerResumeContext(
  input: ResumePromptConcernBuildInput
): boolean {
  return input.state.state === "RUNNING" && input.state.round === 0;
}

export function isIdeationPendingImplementerStartupContext(
  input: StartupPromptConcernBuildInput
): boolean {
  return input.ideationPending === true;
}

export function buildIdeationPendingImplementerStartupLines(
  input: StartupPromptConcernBuildInput
): string[] {
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    "This bubble is ideation-pending (`round=0`).",
    "Do nothing now. Stay idle.",
    "Do not read task files, scan the repository, or search for kickoff sources.",
    "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives.",
    "Wait for explicit human instruction that contains a concrete kickoff task.",
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    })
  ];
}

export function buildIdeationPendingImplementerResumeLines(
  input: ResumePromptConcernBuildInput
): string[] {
  const lines = [
    `Pairflow implementer resume for bubble ${input.bubbleId}.`,
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    "This bubble is ideation-pending (`RUNNING`, `round=0`).",
    "Do nothing now. Stay idle.",
    "Do not read task files, scan the repository, or search for kickoff sources.",
    "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives.",
    "Wait for explicit human instruction that contains a concrete kickoff task.",
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    })
  ];

  if (input.kickoffDiagnostic?.trim().length) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }

  return lines;
}
