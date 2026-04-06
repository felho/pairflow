import { homedir } from "node:os";

import { shellQuote } from "../../../core/util/shellQuote.js";
import {
  buildPairflowCommandGuidance,
  buildPinnedPairflowCommand
} from "../../infrastructure/executor/command/pairflowCommand.js";
import { buildReviewerAgentSelectionGuidance } from "../../../core/runtime/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../../core/runtime/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../../core/runtime/reviewerScoutExpansionGuidance.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../../core/runtime/metaReviewSubmitGuidance.js";
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
  const paneSizeSignatureCommand = "if [ -n \"${TMUX_PANE:-}\" ]; then tmux display-message -p -t \"$TMUX_PANE\" '#{pane_width}x#{pane_height}' 2>/dev/null || true; fi";
  const worktreeLine = shellQuote(displayWorktreePath);
  const loopScript = [
    "set +e",
    "unset NO_COLOR",
    "prev_signature=''",
    "printf '\\033[2J\\033[H'",
    "while true; do",
    // Include seconds so relative runtime/watchdog fields do not appear frozen
    // between minute boundaries when the lifecycle state itself is unchanged.
    "  heartbeat_bucket=$(date -u '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || printf '?')",
    `  ${watchdogCommand}`,
    `  status_json="$(${statusSignatureCommand} 2>&1)"`,
    "  status_json_exit=$?",
    "  next_signature=$(",
    "    printf '%s\\n' \"$status_json\"",
    "    printf '__status_json_exit__=%s\\n' \"$status_json_exit\"",
    `    ${paneSizeSignatureCommand}`,
    "    printf '__heartbeat_bucket__=%s\\n' \"$heartbeat_bucket\"",
    `    printf '%s\\n' ${worktreeLine}`,
    "  )",
    "  if [ \"$next_signature\" != \"$prev_signature\" ]; then",
    "    printf '\\033[H'",
    `    ${statusCommand}`,
    "    status_text_exit=$?",
    "    if [ \"$status_text_exit\" -ne 0 ]; then",
    "      printf 'status pane render error (exit %s)\\n' \"$status_text_exit\"",
    "    fi",
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

function buildCanonicalActorEmitLookupGuidance(input: {
  bubbleId: string;
  repoPath: string;
}): string {
  return `Before direct canonical emit, fetch fresh actor authority via \`pairflow bubble status --id ${input.bubbleId} --repo ${input.repoPath} --json\` and copy \`executionContext.handoffId\` (plus optional guards) from the JSON output. If no explicit authority snapshot is available yet, refresh status and wait for a current handoff instead of falling back to removed aliases.`;
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
    `When signaled, submit only through structured Pairflow CLI and always include required report-json parity fields: \`${buildMetaReviewSubmitCommandTemplate()}\`.`,
    `${buildMetaReviewSubmitApproveParityNote()} Advisory-only open findings are allowed.`,
    "In findings artifacts, use canonical finding severity/priority values only: `P0`, `P1`, `P2`, `P3`.",
    "Do not emit alias severities such as `blocking` or `advisory` in findings artifact entries.",
    "Do not modify transcript/inbox/state files manually.",
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    }),
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
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    }),
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
