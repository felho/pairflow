import { homedir } from "node:os";

import { shellQuote } from "../../shared/foundation/shellQuote.js";
import { buildPinnedPairflowCommand } from "./startCommandPromptRuntime.js";
import type { ReviewerFocusExtractionResult } from "../../shared/reviewer/reviewerBrief.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import {
  buildDocumentPrimaryArtifactReviewerGuardrail,
  buildRolePromptConcernLines
} from "../actorProtocol/roleDescriptorRegistry.js";
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
  pairflowCommandProfile: PairflowCommandProfile,
  externalPairflowCommand?: string
): string {
  const displayWorkspacePath = formatStatusPaneLaunchWorkspacePath(workspacePath);
  const pairflowCommand = buildPinnedPairflowCommand(
    workspacePath,
    pairflowCommandProfile,
    externalPairflowCommand
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

export function buildMetaReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return buildRolePromptConcernLines({
    role: "meta_reviewer",
    phase: "startup",
    context: input
  }).join(" ");
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
  return buildRolePromptConcernLines({
    role: "reviewer",
    phase: "startup",
    context: input
  }).join(" ");
}

export { buildDocumentPrimaryArtifactReviewerGuardrail };
