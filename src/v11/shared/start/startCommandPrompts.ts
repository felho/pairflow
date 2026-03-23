import { homedir } from "node:os";

import { shellQuote } from "../../../core/util/shellQuote.js";
import {
  buildPairflowCommandGuidance,
  buildPinnedPairflowCommand
} from "../../../core/runtime/pairflowCommand.js";
import { buildReviewerAgentSelectionGuidance } from "../../../core/runtime/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../../core/runtime/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../../core/runtime/reviewerScoutExpansionGuidance.js";
import {
  buildReviewerCanonicalCommandGateLines,
  buildReviewerFindingsPassInstruction
} from "../../../core/runtime/reviewerCommandGateGuidance.js";
import { buildReviewerDecisionMatrixReminder } from "../../../core/reviewer/testEvidence.js";
import {
  formatReviewerFocusBridgeBlock,
  formatReviewerBriefPrompt,
  type ReviewerFocusExtractionResult
} from "../../../core/reviewer/reviewerBrief.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
export {
  buildImplementerEvidenceHandoffGuidance,
  buildImplementerIdeationKickoffMessage,
  buildImplementerKickoffMessage,
  buildImplementerStartupPrompt
} from "./startCommandImplementerPrompts.js";

export function buildStatusPaneCommand(
  bubbleId: string,
  repoPath: string,
  worktreePath: string,
  pairflowCommandProfile: PairflowCommandProfile
): string {
  const displayWorktreePath = formatStatusPaneWorktreePath(worktreePath);
  const pairflowCommand = buildPinnedPairflowCommand(
    worktreePath,
    pairflowCommandProfile
  );
  const watchdogCommand = `${pairflowCommand} bubble watchdog --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} >/dev/null 2>&1 || true`;
  const statusCommand = `${pairflowCommand} bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)}`;
  const statusSignatureCommand = `${pairflowCommand} bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} --json`;
  const worktreeLine = shellQuote(displayWorktreePath);
  const loopScript = [
    "set +e",
    "unset NO_COLOR",
    "prev_signature=''",
    "printf '\\033[2J\\033[H'",
    "while true; do",
    `  ${watchdogCommand}`,
    "  next_signature=$(",
    `    ${statusSignatureCommand}`,
    `    printf '%s\\n' ${worktreeLine}`,
    "  )",
    "  if [ \"$next_signature\" != \"$prev_signature\" ]; then",
    "    printf '\\033[H'",
    `    ${statusCommand}`,
    `    printf '%s\\n' ${worktreeLine}`,
    "    printf '\\033[J'",
    "    prev_signature=\"$next_signature\"",
    "  fi",
    "  sleep 2",
    "done"
  ].join("\n");
  return `bash -lc ${shellQuote(loopScript)}`;
}

function formatStatusPaneWorktreePath(worktreePath: string): string {
  const homePath = homedir();
  if (homePath.length === 0) {
    return worktreePath;
  }
  if (worktreePath === homePath) {
    return "~";
  }
  if (
    worktreePath.startsWith(`${homePath}/`) ||
    worktreePath.startsWith(`${homePath}\\`)
  ) {
    return `~${worktreePath.slice(homePath.length)}`;
  }
  return worktreePath;
}

export function buildMetaReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `Pairflow meta-reviewer start for bubble ${input.bubbleId}.`,
    "This is a dedicated static worker pane for autonomous meta-review tasks.",
    "Stay idle until orchestration signals a meta-review run.",
    "When signaled, submit only through structured Pairflow CLI: `pairflow bubble meta-review submit --id <id> --round <n> --recommendation <approve|rework|inconclusive> --summary \"...\" --report-markdown \"...\"`.",
    "Do not modify transcript/inbox/state files manually.",
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    `Task: ${input.taskArtifactPath}.`,
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`
  ].join(" ");
}

export function buildReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  policySnapshotPathAbs: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
}): string {
  const documentPrimaryArtifactGuardrail = buildDocumentPrimaryArtifactReviewerGuardrail(
    input.reviewArtifactType
  );
  return [
    `Pairflow reviewer start for bubble ${input.bubbleId}.`,
    "Stand by first. Do not start reviewing until implementer handoff (`PASS`) arrives.",
    "When PASS arrives, run a fresh review.",
    "When PASS arrives, follow the orchestrator test-evidence skip/run directive for test execution.",
    buildReviewerSeverityOntologyReminder(),
    `Reviewer policy file: ${input.policySnapshotPathAbs}`,
    "Read this file before first review action.",
    buildReviewerDecisionMatrixReminder(),
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
    buildReviewerFindingsPassInstruction(input.reviewArtifactType),
    ...buildReviewerCanonicalCommandGateLines(),
    "Execute pairflow commands directly from this worktree (do not ask for confirmation first).",
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    "Never edit transcript/inbox/state files manually.",
    `Repo: ${input.repoPath}. Worktree: ${input.worktreePath}. Task: ${input.taskArtifactPath}.`
  ].join(" ");
}

export function buildDocumentPrimaryArtifactReviewerGuardrail(
  reviewArtifactType: ReviewArtifactType
): string | undefined {
  if (reviewArtifactType !== "document") {
    return undefined;
  }

  return [
    "Primary artifact review rule (docs-only): treat a PASS as out-of-scope if it only adds a new standalone review/synthesis document while the referenced source task/document file is unchanged.",
    "In that case, request rework so the primary referenced artifact is refined directly."
  ].join(" ");
}
