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

export function buildImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  donePackagePath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  ideationPending: boolean;
}): string {
  if (input.ideationPending) {
    return [
      `Pairflow implementer start for bubble ${input.bubbleId}.`,
      "This bubble is ideation-pending (`round=0`).",
      "Do nothing now. Stay idle.",
      "Do not read task files, scan the repository, or search for kickoff sources.",
      "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow pass`, `pairflow ask-human`, `pairflow converged`) unless explicit human instruction arrives.",
      "Wait for explicit human instruction that contains a concrete kickoff task.",
      `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`
    ].join(" ");
  }

  const evidenceHandoffGuidance = buildImplementerEvidenceHandoffGuidance(
    input.reviewArtifactType
  );
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    `Read task: ${input.taskArtifactPath}.`,
    "Implement in this worktree and run relevant validation before handoff.",
    `Execute pairflow commands from this worktree path only: ${input.worktreePath}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    evidenceHandoffGuidance,
    `Keep done package updated at: ${input.donePackagePath}.`,
    "Done package should summarize changes + validation results for final commit handoff.",
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    "When done, run `pairflow pass --summary \"<what changed + validation>\"` with available evidence `--ref` attachments.",
    "Use `pairflow ask-human --question \"...\"` only for blockers."
  ].join(" ");
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
    buildReviewerSeverityOntologyReminder({ includeFullOntology: true }),
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

export function buildImplementerKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff.`,
    `Read task file now: ${input.taskArtifactPath}.`,
    "Start implementation immediately in this worktree.",
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    buildImplementerEvidenceHandoffGuidance(input.reviewArtifactType),
    "When done with validation, hand off with `pairflow pass --summary \"<what changed + validation>\"` and include available evidence `--ref` log paths."
  ].join(" ");
}

export function buildImplementerIdeationKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff (ideation pending).`,
    "This bubble is in ideation mode; no implementer action is required.",
    "Stay idle and wait for explicit human instruction.",
    "Do not run `pairflow bubble kickoff` yourself and do not emit implementer/reviewer handoff yet."
  ].join(" ");
}

export function buildImplementerEvidenceHandoffGuidance(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "document") {
    return [
      "This bubble is docs-only (`review_artifact_type=document`), so runtime checks are not required in this round.",
      "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output.",
      "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path.",
      "Docs-only scope: choose one mode and keep it consistent in the same PASS.",
      "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs.",
      "Mode B (checks executed): if you run validation (for example `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`), make sure evidence logs are written to `.pairflow/evidence/`, attach only refs for commands you actually ran, and do not claim checks were intentionally not executed."
    ].join(" ");
  }

  return [
    "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check` so evidence logs are written to `.pairflow/evidence/`.",
    "If evidence logs exist, include them as `--ref` when running `pairflow pass`.",
    "If only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.",
    "Missing expected evidence logs should be treated as incomplete validation packaging."
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
