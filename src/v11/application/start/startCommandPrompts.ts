import { homedir } from "node:os";

import { shellQuote } from "../../shared/foundation/shellQuote.js";
import {
  buildPairflowCommandGuidance,
  buildPinnedPairflowCommand
} from "./startCommandPromptRuntime.js";
import { buildReviewerAgentSelectionGuidance } from "../../shared/reviewer/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../shared/reviewer/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../shared/reviewer/reviewerScoutExpansionGuidance.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../shared/metaReview/metaReviewSubmitGuidance.js";
import {
  buildReviewerCanonicalCommandGateLines,
  buildReviewerFindingsPassInstruction
} from "../../shared/reviewer/reviewerCommandGateGuidance.js";
import { buildReviewerDecisionMatrixReminder } from "../../shared/reviewer/testEvidence.js";
import {
  formatReviewerFocusBridgeBlock,
  formatReviewerBriefPrompt,
  type ReviewerFocusExtractionResult
} from "../../shared/reviewer/reviewerBrief.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import {
  buildLaunchWorkspaceCommandScopeLine,
  buildRepositoryLaunchWorkspaceLine,
  buildRepoLaunchWorkspaceTaskLine
} from "./startCommandWorkspacePromptLines.js";
export {
  buildImplementerEvidenceHandoffGuidance,
  buildImplementerIdeationKickoffMessage,
  buildImplementerKickoffMessage,
  buildImplementerStartupPrompt
} from "./startCommandImplementerPrompts.js";

export function buildStatusPaneCommand(
  bubbleId: string,
  repoPath: string,
  workspacePath: string,
  pairflowCommandProfile: PairflowCommandProfile
): string {
  const displayWorkspacePath = formatStatusPaneLaunchWorkspacePath(workspacePath);
  const pairflowCommand = buildPinnedPairflowCommand(
    workspacePath,
    pairflowCommandProfile
  );
  const watchdogCommand = `${pairflowCommand} bubble watchdog --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} >/dev/null 2>&1 || true`;
  const statusCommand = `${pairflowCommand} bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)}`;
  const statusSignatureCommand = `${pairflowCommand} bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} --json`;
  const paneSizeSignatureCommand = "if [ -n \"${TMUX_PANE:-}\" ]; then tmux display-message -p -t \"$TMUX_PANE\" '#{pane_width}x#{pane_height}' 2>/dev/null || true; fi";
  const workspaceLine = shellQuote(displayWorkspacePath);
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
    `    printf '%s\\n' ${workspaceLine}`,
    "  )",
    "  if [ \"$next_signature\" != \"$prev_signature\" ]; then",
    "    printf '\\033[H'",
    `    ${statusCommand}`,
    "    status_text_exit=$?",
    "    if [ \"$status_text_exit\" -ne 0 ]; then",
    "      printf 'status pane render error (exit %s)\\n' \"$status_text_exit\"",
    "    fi",
    `    printf '%s\\n' ${workspaceLine}`,
    "    printf '\\033[J'",
    "    prev_signature=\"$next_signature\"",
    "  fi",
    "  sleep 2",
    "done"
  ].join("\n");
  return `bash -lc ${shellQuote(loopScript)}`;
}

function formatStatusPaneLaunchWorkspacePath(workspacePath: string): string {
  const homePath = homedir();
  if (homePath.length === 0) {
    return workspacePath;
  }
  if (workspacePath === homePath) {
    return "~";
  }
  if (
    workspacePath.startsWith(`${homePath}/`) ||
    workspacePath.startsWith(`${homePath}\\`)
  ) {
    return `~${workspacePath.slice(homePath.length)}`;
  }
  return workspacePath;
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
  workspacePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `Pairflow meta-reviewer start for bubble ${input.bubbleId}.`,
    "This is a dedicated static worker pane for autonomous meta-review tasks.",
    "Stay idle until orchestration signals a meta-review run.",
    `When signaled, submit only through structured Pairflow CLI and always include required report-json parity fields: \`${buildMetaReviewSubmitCommandTemplate()}\`.`,
    buildMetaReviewSubmitApproveParityNote(),
    "In findings artifacts, use canonical finding severity/priority values only: `P0`, `P1`, `P2`, `P3`.",
    "Do not emit alias severities such as `blocking` or `advisory` in findings artifact entries.",
    "Do not modify transcript/inbox/state files manually.",
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    }),
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    `Task: ${input.taskArtifactPath}.`,
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    })
  ].join(" ");
}

export function buildReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
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
    buildLaunchWorkspaceCommandScopeLine(input.workspacePath),
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    "Never edit transcript/inbox/state files manually.",
    buildRepoLaunchWorkspaceTaskLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath,
      taskArtifactPath: input.taskArtifactPath
    })
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
