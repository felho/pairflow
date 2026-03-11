import { basename, dirname, join } from "node:path";

import { readRuntimeSessionsRegistry } from "./sessionsRegistry.js";
import { runTmux, runtimePaneIndices, type TmuxRunner } from "./tmuxManager.js";
import { maybeAcceptClaudeTrustPrompt, sendAndSubmitTmuxPaneMessage, submitTmuxPaneInput } from "./tmuxInput.js";
import { buildReviewerAgentSelectionGuidance } from "./reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "./reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "./reviewerScoutExpansionGuidance.js";
import {
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection,
  type ReviewerCommandGateProjectionVariant
} from "./reviewerCommandGateGuidance.js";
import {
  buildReviewerDecisionMatrixReminder,
  formatReviewerTestExecutionDirective,
  type ReviewerTestExecutionDirective
} from "../reviewer/testEvidence.js";
import {
  formatReviewerBriefDeliveryReminder,
  formatReviewerFocusDeliveryReminder,
  type ReviewerFocusExtractionResult
} from "../reviewer/reviewerBrief.js";
import { buildPairflowCommandGuidance } from "./pairflowCommand.js";
import type { BubbleConfig } from "../../types/bubble.js";
import type { AgentName } from "../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolParticipant } from "../../types/protocol.js";

export interface EmitTmuxDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  reviewerBrief?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  messageRef?: string;
  initialDelayMs?: number;
  deliveryAttempts?: number;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export interface ResolveDeliveryMessageRefInput {
  bubbleId: string;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export type TmuxDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "tmux_send_failed";

export interface EmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: TmuxDeliveryFailureReason;
}

function resolveTargetPaneIndex(
  recipient: ProtocolParticipant | "meta-reviewer",
  bubbleConfig: BubbleConfig
): number | undefined {
  if (recipient === bubbleConfig.agents.implementer) {
    return runtimePaneIndices.implementer;
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return runtimePaneIndices.reviewer;
  }
  if (recipient === "meta-reviewer") {
    return runtimePaneIndices.metaReviewer;
  }
  if (recipient === "human" || recipient === "orchestrator") {
    return runtimePaneIndices.status;
  }
  return undefined;
}

function resolvePayloadActor(envelope: ProtocolEnvelope): string | null {
  const metadata = envelope.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }
  const actor = (metadata as { actor?: unknown }).actor;
  return typeof actor === "string" && actor.trim().length > 0 ? actor : null;
}

function buildDeliveryMessage(
  envelope: ProtocolEnvelope,
  messageRef: string,
  bubbleConfig: BubbleConfig,
  worktreePath?: string,
  reviewerTestDirective?: ReviewerTestExecutionDirective,
  reviewerBrief?: string,
  reviewerFocus?: ReviewerFocusExtractionResult
): string {
  const recipientRole =
    envelope.recipient === bubbleConfig.agents.implementer
      ? "implementer"
      : envelope.recipient === bubbleConfig.agents.reviewer
      ? "reviewer"
      : envelope.recipient;
  const actorLabel = resolvePayloadActor(envelope);
  const worktreeHint =
    worktreePath === undefined
      ? "Run pairflow commands from the bubble worktree root."
      : `Run pairflow commands from worktree: ${worktreePath}. ${buildPairflowCommandGuidance(worktreePath, bubbleConfig.pairflow_command_profile)}`;

  let action = "Continue protocol from this event.";
  if (recipientRole === "implementer") {
    const docsOnly = bubbleConfig.review_artifact_type === "document";
    if (envelope.type === "PASS") {
      action = docsOnly
        ? "Reviewer feedback received. Implement fixes, then hand off with `pairflow pass --summary` directly (no confirmation prompt). Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output. Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path. Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed."
        : "Reviewer feedback received. Implement fixes, then hand off with `pairflow pass --summary` directly (no confirmation prompt). If `.pairflow/evidence/*.log` files exist, include them as `--ref` (lint/typecheck/test). If only a subset ran, attach refs for that subset and state what was intentionally not executed.";
    } else if (envelope.type === "HUMAN_REPLY") {
      action = docsOnly
        ? "Human response received. Continue implementation using this input, then hand off with `pairflow pass --summary` directly. Primary artifact rule (docs-only): refine the referenced source task/document file directly, not only a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
        : "Human response received. Continue implementation using this input, then hand off with `pairflow pass --summary` directly. Include available `.pairflow/evidence/*.log` refs on PASS.";
    } else if (envelope.type === "APPROVAL_DECISION") {
      if (envelope.payload.decision === "revise") {
        action = docsOnly
          ? "Human requested rework. Continue implementation now and address the requested changes, then hand off with `pairflow pass --summary` directly. Primary artifact rule (docs-only): apply the rework on the referenced source task/document file directly, not only in a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
          : "Human requested rework. Continue implementation now and address the requested changes, then hand off with `pairflow pass --summary` directly. Include available `.pairflow/evidence/*.log` refs on PASS.";
      } else if (envelope.payload.decision === "approve") {
        action =
          "Human approved this bubble. Wait for commit/merge flow and do not continue new implementation in this round.";
      } else {
        action =
          "Human approval decision received. Continue according to current bubble state/inbox.";
      }
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        actorLabel === "meta-reviewer"
          ? "Meta-reviewer requested human gate decision. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now."
          : "Bubble is READY_FOR_HUMAN_APPROVAL. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now.";
    }
  } else if (recipientRole === "reviewer") {
    if (envelope.type === "PASS") {
      const useFullReviewerPolicyContext = bubbleConfig.reviewer_context_mode === "fresh";
      const testDirective =
        reviewerTestDirective === undefined
          ? [
              "Run required checks before final judgment. Reason: reviewer test verification directive was unavailable.",
              ...(useFullReviewerPolicyContext
                ? [buildReviewerDecisionMatrixReminder()]
                : [])
            ].join(" ")
          : formatReviewerTestExecutionDirective(reviewerTestDirective);
      const projectionVariant: ReviewerCommandGateProjectionVariant =
        Array.isArray(envelope.payload.findings) && envelope.payload.findings.length > 0
          ? "findings"
          : "clean";
      const convergenceInstruction = buildReviewerRoundCommandGateProjection({
        round: envelope.round,
        variant: projectionVariant
      });
      const findingsDetailInstruction =
        envelope.round <= 1
          ? "In round 1, declare findings explicitly with `--finding` or `--no-findings` when using `pairflow pass`."
          : buildReviewerFindingsPassInstruction(
            bubbleConfig.review_artifact_type
          );
      const reviewerFocusReminder =
        reviewerFocus === undefined
          ? ""
          : formatReviewerFocusDeliveryReminder(reviewerFocus);
      action = [
        "Implementer handoff received. Run a fresh review now.",
        buildReviewerAgentSelectionGuidance(bubbleConfig.review_artifact_type),
        buildReviewerSeverityOntologyReminder({
          includeFullOntology: useFullReviewerPolicyContext
        }),
        testDirective,
        buildReviewerScoutExpansionWorkflowGuidance(),
        buildReviewerPassOutputContractGuidance(),
        convergenceInstruction,
        findingsDetailInstruction,
        reviewerBrief !== undefined
          ? formatReviewerBriefDeliveryReminder(reviewerBrief)
          : "",
        reviewerFocusReminder,
        "Execute pairflow commands directly (no confirmation prompt)."
      ]
        .filter((part) => part.trim().length > 0)
        .join(" ");
    } else if (envelope.type === "HUMAN_REPLY") {
      action =
        "Human response received. Continue review workflow from this update.";
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        actorLabel === "meta-reviewer"
          ? "Meta-reviewer requested human gate decision. Wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now."
          : "Bubble is READY_FOR_HUMAN_APPROVAL. Review is complete; wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now.";
    }
  } else if (recipientRole === "human" || recipientRole === "orchestrator") {
    action = "Check inbox/status and continue human orchestration flow.";
  }

  // Prefix as shell comment so if a pane is in plain bash fallback, this line remains harmless.
  return `# [pairflow] r${envelope.round} ${envelope.type} ${envelope.sender}->${envelope.recipient} msg=${envelope.id} ref=${messageRef}. Action: ${action} ${worktreeHint}`;
}

export function buildTranscriptFallbackRef(
  bubbleId: string,
  sessionsPath: string,
  messageId: string
): string {
  const pairflowDir = resolvePairflowDirFromSessionsPath(sessionsPath);
  const transcriptPath = join(pairflowDir, "bubbles", bubbleId, "transcript.ndjson");
  return `${transcriptPath}#${messageId}`;
}

function resolvePairflowDirFromSessionsPath(sessionsPath: string): string {
  const match = /^(.*[\\/]\.pairflow)(?:[\\/]|$)/u.exec(sessionsPath);
  if (match?.[1] !== undefined) {
    return match[1];
  }
  const runtimeDir = dirname(sessionsPath);
  if (basename(runtimeDir) === "runtime") {
    return join(dirname(runtimeDir), ".pairflow");
  }
  return join(runtimeDir, ".pairflow");
}

export function resolveDeliveryMessageRef(input: ResolveDeliveryMessageRefInput): string {
  return (
    input.messageRef ??
    input.envelope.refs[0] ??
    buildTranscriptFallbackRef(input.bubbleId, input.sessionsPath, input.envelope.id)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

type MarkerStatus = "submitted" | "stuck_in_input" | "not_found";

/**
 * Check whether a delivery marker appears in a tmux pane's visible content.
 *
 * `capture-pane -p` returns both the output area AND the current input buffer.
 * If the marker only appears after the last `>` prompt indicator, the message
 * is still sitting in the input buffer (Enter didn't submit).  We distinguish:
 *
 * - "submitted":       marker found in the output area (before the prompt)
 * - "stuck_in_input":  marker found only after the last `>` prompt line
 * - "not_found":       marker not present at all
 */
async function checkMarkerStatus(
  runner: TmuxRunner,
  targetPane: string,
  marker: string
): Promise<MarkerStatus> {
  const capture = await runner(["capture-pane", "-pt", targetPane], {
    allowFailure: true
  });
  if (capture.exitCode !== 0) {
    return "not_found";
  }
  const output = capture.stdout;
  if (!output.includes(marker)) {
    return "not_found";
  }

  // Find the last prompt line.  Claude Code renders `>` (or `❯`) at the start
  // of its input area.  Everything after that line is the current input buffer.
  const lines = output.split("\n");
  const lastPromptIdx = findLastIndex(
    lines,
    (l) => /^\s*[>❯]/.test(l)
  );
  if (lastPromptIdx < 0) {
    // No prompt visible — marker is in output area.
    return "submitted";
  }

  const beforePrompt = lines.slice(0, lastPromptIdx).join("\n");
  if (beforePrompt.includes(marker)) {
    return "submitted";
  }

  // Marker only appears in/after the prompt line → stuck in input buffer.
  return "stuck_in_input";
}

function findLastIndex(arr: string[], predicate: (item: string) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i]!)) {
      return i;
    }
  }
  return -1;
}

export async function emitTmuxDeliveryNotification(
  input: EmitTmuxDeliveryNotificationInput
): Promise<EmitTmuxDeliveryNotificationResult> {
  const messageRef =
    input.messageRef ??
    resolveDeliveryMessageRef({
      bubbleId: input.bubbleId,
      sessionsPath: input.sessionsPath,
      envelope: input.envelope
    });
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  let worktreePath: string | undefined;
  try {
    const sessions = await readSessions(input.sessionsPath, {
      allowMissing: true
    });
    const record = sessions[input.bubbleId];
    sessionName = record?.tmuxSessionName;
    worktreePath = record?.worktreePath;
  } catch {
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig,
      undefined,
      input.reviewerTestDirective,
      input.reviewerBrief,
      input.reviewerFocus
    );
    return {
      delivered: false,
      message,
      reason: "registry_read_failed"
    };
  }

  if (sessionName === undefined) {
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig,
      undefined,
      input.reviewerTestDirective,
      input.reviewerBrief,
      input.reviewerFocus
    );
    return {
      delivered: false,
      message,
      reason: "no_runtime_session"
    };
  }

  const targetPaneIndex = resolveTargetPaneIndex(
    input.envelope.recipient,
    input.bubbleConfig
  );
  if (targetPaneIndex === undefined) {
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig,
      worktreePath,
      input.reviewerTestDirective,
      input.reviewerBrief,
      input.reviewerFocus
    );
    return {
      delivered: false,
      sessionName,
      message,
      reason: "unsupported_recipient"
    };
  }

  const targetPane = `${sessionName}:0.${targetPaneIndex}`;
  const message = buildDeliveryMessage(
    input.envelope,
    messageRef,
    input.bubbleConfig,
    worktreePath,
    input.reviewerTestDirective,
    input.reviewerBrief,
    input.reviewerFocus
  );
  const runner = input.runner ?? runTmux;

  try {
    if ((input.initialDelayMs ?? 0) > 0) {
      await sleep(input.initialDelayMs as number);
    }
    const attempts = Math.max(1, input.deliveryAttempts ?? 3);
    let confirmed = false;
    await maybeAcceptClaudeTrustPrompt(runner, targetPane).catch(() => undefined);
    // Send message + trailing newline in a single literal send-keys call.
    // This eliminates the timing gap between text entry and Enter that caused
    // messages to get stuck in the Claude Code input buffer without submitting.
    await sendAndSubmitTmuxPaneMessage(runner, targetPane, message);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      // Allow UI flush then check where the marker appears.
      await sleep(800);
      const status = await checkMarkerStatus(runner, targetPane, input.envelope.id);
      if (status === "submitted") {
        confirmed = true;
        break;
      }
      if (attempt < attempts - 1) {
        // "stuck_in_input" or "not_found" — retry with a bare Enter.
        await sleep(900);
        await submitTmuxPaneInput(runner, targetPane);
      }
    }
    if (!confirmed) {
      return {
        delivered: false,
        sessionName,
        targetPaneIndex,
        message,
        reason: "delivery_unconfirmed"
      };
    }
  } catch {
    return {
      delivered: false,
      sessionName,
      targetPaneIndex,
      message,
      reason: "tmux_send_failed"
    };
  }

  return {
    delivered: true,
    sessionName,
    targetPaneIndex,
    message
  };
}

// ---------------------------------------------------------------------------
// Stuck-input retry — called periodically by the watchdog loop
// ---------------------------------------------------------------------------

export interface RetryStuckAgentInputOptions {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  activeAgent: AgentName;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

export interface RetryStuckAgentInputResult {
  retried: boolean;
  reason?: "no_session" | "no_pane" | "not_stuck" | "pane_read_failed";
}

/**
 * Check whether the active agent's tmux pane has a pairflow message stuck
 * in its input buffer (text visible after the prompt but not submitted).
 * If so, press Enter to unstick it.
 *
 * Designed to be called from the watchdog loop (every ~2 s) as a
 * best-effort safety net for delivery failures.
 */
export async function retryStuckAgentInput(
  options: RetryStuckAgentInputOptions
): Promise<RetryStuckAgentInputResult> {
  const runner = options.runner ?? runTmux;
  const readSessions = options.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  try {
    const sessions = await readSessions(options.sessionsPath, {
      allowMissing: true
    });
    sessionName = sessions[options.bubbleId]?.tmuxSessionName;
  } catch {
    return { retried: false, reason: "no_session" };
  }

  if (sessionName === undefined) {
    return { retried: false, reason: "no_session" };
  }

  const paneIndex = resolveTargetPaneIndex(
    options.activeAgent,
    options.bubbleConfig
  );
  if (paneIndex === undefined) {
    return { retried: false, reason: "no_pane" };
  }

  const targetPane = `${sessionName}:0.${paneIndex}`;
  const capture = await runner(["capture-pane", "-pt", targetPane], {
    allowFailure: true
  });
  if (capture.exitCode !== 0) {
    return { retried: false, reason: "pane_read_failed" };
  }

  const output = capture.stdout;
  if (!output.includes("[pairflow]")) {
    return { retried: false, reason: "not_stuck" };
  }

  // Check if the [pairflow] marker is stuck in the input buffer
  // (after the last prompt line) rather than in the output area.
  const lines = output.split("\n");
  const lastPromptIdx = findLastIndex(lines, (l) => /^\s*[>❯]/.test(l));
  if (lastPromptIdx < 0) {
    // No prompt visible — marker is in output area, not stuck.
    return { retried: false, reason: "not_stuck" };
  }

  const beforePrompt = lines.slice(0, lastPromptIdx).join("\n");
  if (beforePrompt.includes("[pairflow]")) {
    // Marker is in the output area — already submitted.
    return { retried: false, reason: "not_stuck" };
  }

  // Marker only appears after the prompt → stuck in input buffer.
  await submitTmuxPaneInput(runner, targetPane);
  return { retried: true };
}
