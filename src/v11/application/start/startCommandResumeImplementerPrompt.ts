import {
  buildPairflowCommandGuidance
} from "./startCommandPromptRuntime.js";
import type {
  BubbleStateSnapshot,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { buildImplementerEvidenceHandoffGuidance } from "./startCommandPrompts.js";
import {
  appendKickoffDiagnosticLine,
  buildResumeContextLine,
  joinPromptLines
} from "./startCommandResumePromptShared.js";
import {
  buildLaunchWorkspaceCommandScopeLine,
  buildRepositoryLaunchWorkspaceLine
} from "./startCommandWorkspacePromptLines.js";

function buildIdeationPendingPromptLines(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
}): string[] {
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
  appendKickoffDiagnosticLine(lines, input.kickoffDiagnostic);
  return lines;
}

function resolveImplementerRoleInstruction(state: BubbleStateSnapshot): string {
  const ideationPending = state.state === "RUNNING" && state.round === 0;
  if (state.state === "RUNNING" && state.active_role === "implementer" && ideationPending) {
    return "You are active in ideation pending mode. Do not implement yet; first run kickoff with a concrete task.";
  }
  if (state.state === "RUNNING" && state.active_role === "implementer") {
    return "You are currently active. Continue implementation now.";
  }
  return "Continue implementation when you become active; otherwise stand by.";
}

export function buildResumeImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  donePackagePath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
}): string {
  const ideationPending =
    input.state.state === "RUNNING" && input.state.round === 0;
  if (ideationPending) {
    return joinPromptLines(buildIdeationPendingPromptLines(input));
  }

  const evidenceHandoffGuidance = buildImplementerEvidenceHandoffGuidance(
    input.reviewArtifactType
  );
  const lines = [
    `Pairflow implementer resume for bubble ${input.bubbleId}.`,
    `Task: ${input.taskArtifactPath}.`,
    `Done package: ${input.donePackagePath}.`,
    buildLaunchWorkspaceCommandScopeLine(input.workspacePath),
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    }),
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    ...(evidenceHandoffGuidance !== undefined
      ? [evidenceHandoffGuidance]
      : [
          `Provide a concrete task via \`pairflow bubble kickoff --id ${input.bubbleId} --task "<text>"\` or \`--task-file <path>\`.`,
          "Do not use the current placeholder artifact as kickoff input.",
          "If no concrete task source is available, send a blocker with `pairflow agent emit --kind human_question --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --question \"...\"`."
        ]),
    resolveImplementerRoleInstruction(input.state)
  ];
  appendKickoffDiagnosticLine(lines, input.kickoffDiagnostic);
  return joinPromptLines(lines);
}
