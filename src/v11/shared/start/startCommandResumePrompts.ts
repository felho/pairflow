import {
  buildReviewerCanonicalCommandGateLines
} from "../../../core/runtime/reviewerCommandGateGuidance.js";
import { buildReviewerAgentSelectionGuidance } from "../../../core/runtime/reviewerGuidance.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../../core/runtime/reviewerScoutExpansionGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../../core/runtime/reviewerSeverityOntology.js";
import {
  buildPairflowCommandGuidance
} from "../../../core/runtime/pairflowCommand.js";
import {
  buildReviewerDecisionMatrixReminder
} from "../../../core/reviewer/testEvidence.js";
import {
  formatReviewerFocusBridgeBlock,
  formatReviewerBriefPrompt,
  type ReviewerFocusExtractionResult
} from "../../../core/reviewer/reviewerBrief.js";
import type {
  BubbleStateSnapshot,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import {
  buildDocumentPrimaryArtifactReviewerGuardrail,
  buildImplementerEvidenceHandoffGuidance
} from "./startCommandPrompts.js";

function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

function buildResumeContextLine(state: BubbleStateSnapshot): string {
  return [
    `state=${state.state}`,
    `round=${state.round}`,
    `active_agent=${formatResumeStateValue(state.active_agent)}`,
    `active_role=${formatResumeStateValue(state.active_role)}`
  ].join(", ");
}

export function buildResumeImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
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
    const lines = [
      `Pairflow implementer resume for bubble ${input.bubbleId}.`,
      `State snapshot: ${buildResumeContextLine(input.state)}.`,
      `Transcript context: ${input.transcriptSummary}`,
      "This bubble is ideation-pending (`RUNNING`, `round=0`).",
      "Do nothing now. Stay idle.",
      "Do not read task files, scan the repository, or search for kickoff sources.",
      "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow pass`, `pairflow ask-human`, `pairflow converged`) unless explicit human instruction arrives.",
      "Wait for explicit human instruction that contains a concrete kickoff task.",
      `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`
    ];
    if ((input.kickoffDiagnostic?.trim().length ?? 0) > 0) {
      lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
    }
    return lines.join(" ");
  }

  const evidenceHandoffGuidance = ideationPending
    ? undefined
    : buildImplementerEvidenceHandoffGuidance(input.reviewArtifactType);
  const roleInstruction =
    input.state.state === "RUNNING" &&
      input.state.active_role === "implementer" &&
      ideationPending
      ? "You are active in ideation pending mode. Do not implement yet; first run kickoff with a concrete task."
      : input.state.state === "RUNNING" && input.state.active_role === "implementer"
      ? "You are currently active. Continue implementation now."
      : "Continue implementation when you become active; otherwise stand by.";
  const lines = [
    `Pairflow implementer resume for bubble ${input.bubbleId}.`,
    `Task: ${input.taskArtifactPath}.`,
    `Done package: ${input.donePackagePath}.`,
    `Execute pairflow commands from this worktree path only: ${input.worktreePath}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    ...(evidenceHandoffGuidance !== undefined
      ? [evidenceHandoffGuidance]
      : [
          `Provide a concrete task via \`pairflow bubble kickoff --id ${input.bubbleId} --task "<text>"\` or \`--task-file <path>\`.`,
          "Do not use the current placeholder artifact as kickoff input.",
          "If no concrete task source is available, send a blocker with `pairflow ask-human --question \"...\"`."
        ]),
    roleInstruction
  ];
  if ((input.kickoffDiagnostic?.trim().length ?? 0) > 0) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }
  return lines.join(" ");
}

export function buildResumeMetaReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
}): string {
  const lines = [
    `Pairflow meta-reviewer resume for bubble ${input.bubbleId}.`,
    "This pane is static across rounds; do not restart unless explicitly instructed.",
    "Stay idle until orchestration signals a meta-review run.",
    "When signaled, return result only through structured Pairflow submit command (no pane marker output parsing).",
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    `Task: ${input.taskArtifactPath}.`,
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`
  ];
  if ((input.kickoffDiagnostic?.trim().length ?? 0) > 0) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }
  return lines.join(" ");
}

export function buildResumeReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
  reviewArtifactType: ReviewArtifactType;
  reviewerTestDirectiveLine?: string;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
}): string {
  const documentPrimaryArtifactGuardrail = buildDocumentPrimaryArtifactReviewerGuardrail(
    input.reviewArtifactType
  );
  const roleInstruction =
    input.state.state === "RUNNING" && input.state.active_role === "reviewer"
      ? "You are currently active. Continue review now."
      : "Stand by unless you are active or receive a handoff.";
  const lines = [
    `Pairflow reviewer resume for bubble ${input.bubbleId}.`,
    `Task: ${input.taskArtifactPath}.`,
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    "Follow orchestrator test-evidence skip/run directive for test execution.",
    buildReviewerSeverityOntologyReminder({ includeFullOntology: true }),
    buildReviewerDecisionMatrixReminder(),
    ...(input.reviewerTestDirectiveLine !== undefined
      ? [`Current directive: ${input.reviewerTestDirectiveLine}`]
      : []),
    buildReviewerAgentSelectionGuidance(input.reviewArtifactType),
    ...(documentPrimaryArtifactGuardrail !== undefined
      ? [documentPrimaryArtifactGuardrail]
      : []),
    buildReviewerScoutExpansionWorkflowGuidance(),
    buildReviewerPassOutputContractGuidance(),
    ...(input.reviewerBriefText !== undefined
      ? [formatReviewerBriefPrompt(input.reviewerBriefText)]
      : []),
    ...(input.reviewerFocus?.status === "present"
      ? [formatReviewerFocusBridgeBlock(input.reviewerFocus)]
      : []),
    ...buildReviewerCanonicalCommandGateLines(),
    roleInstruction
  ];
  if ((input.kickoffDiagnostic?.trim().length ?? 0) > 0) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }
  return lines.join(" ");
}

export { resolveResumeKickoffMessages } from "./startCommandResumeKickoffMessages.js";
