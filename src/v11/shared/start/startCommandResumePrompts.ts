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
  buildDocumentPrimaryArtifactReviewerGuardrail
} from "./startCommandPrompts.js";
import {
  appendKickoffDiagnosticLine,
  buildResumeContextLine,
  joinPromptLines
} from "./startCommandResumePromptShared.js";
export { buildResumeImplementerStartupPrompt } from "./startCommandResumeImplementerPrompt.js";

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
  appendKickoffDiagnosticLine(lines, input.kickoffDiagnostic);
  return joinPromptLines(lines);
}

export function buildResumeReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  policySnapshotPathAbs: string;
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
    buildReviewerSeverityOntologyReminder(),
    `Reviewer policy file: ${input.policySnapshotPathAbs}`,
    "Read this file before first review action.",
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
  appendKickoffDiagnosticLine(lines, input.kickoffDiagnostic);
  return joinPromptLines(lines);
}

export { resolveResumeKickoffMessages } from "./startCommandResumeKickoffMessages.js";
