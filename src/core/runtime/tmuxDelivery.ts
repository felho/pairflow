import { readRuntimeSessionsRegistry } from "./sessionsRegistry.js";
import { runTmux, type TmuxRunner } from "./tmuxManager.js";
import { maybeAcceptClaudeTrustPrompt, sendAndSubmitTmuxPaneMessage, submitTmuxPaneInput } from "./tmuxInput.js";
import { buildReviewerAgentSelectionGuidance } from "./reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "./reviewerSeverityOntology.js";
import {
  buildReviewerDecisionMatrixReminder,
  formatReviewerTestExecutionDirective,
  type ReviewerTestExecutionDirective
} from "../reviewer/testEvidence.js";
import type { BubbleConfig } from "../../types/bubble.js";
import type { AgentName } from "../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolParticipant } from "../../types/protocol.js";

export interface EmitTmuxDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  messageRef?: string;
  initialDelayMs?: number;
  deliveryAttempts?: number;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
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
  recipient: ProtocolParticipant,
  bubbleConfig: BubbleConfig
): number | undefined {
  if (recipient === bubbleConfig.agents.implementer) {
    return 1;
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return 2;
  }
  if (recipient === "human" || recipient === "orchestrator") {
    return 0;
  }
  return undefined;
}

function buildDeliveryMessage(
  envelope: ProtocolEnvelope,
  messageRef: string,
  bubbleConfig: BubbleConfig,
  worktreePath?: string,
  reviewerTestDirective?: ReviewerTestExecutionDirective
): string {
  const recipientRole =
    envelope.recipient === bubbleConfig.agents.implementer
      ? "implementer"
      : envelope.recipient === bubbleConfig.agents.reviewer
      ? "reviewer"
      : envelope.recipient;
  const worktreeHint =
    worktreePath === undefined
      ? "Run pairflow commands from the bubble worktree root."
      : `Run pairflow commands from worktree: ${worktreePath}.`;

  let action = "Continue protocol from this event.";
  if (recipientRole === "implementer") {
    if (envelope.type === "PASS") {
      action =
        "Reviewer feedback received. Implement fixes, then hand off with `pairflow pass --summary` directly (no confirmation prompt). If `.pairflow/evidence/*.log` files exist, include them as `--ref` (lint/typecheck/test). If only a subset ran, attach refs for that subset and state what was intentionally not executed.";
    } else if (envelope.type === "HUMAN_REPLY") {
      action =
        "Human response received. Continue implementation using this input, then hand off with `pairflow pass --summary` directly. Include available `.pairflow/evidence/*.log` refs on PASS.";
    } else if (envelope.type === "APPROVAL_DECISION") {
      if (envelope.payload.decision === "revise") {
        action =
          "Human requested rework. Continue implementation now and address the requested changes, then hand off with `pairflow pass --summary` directly. Include available `.pairflow/evidence/*.log` refs on PASS.";
      } else if (envelope.payload.decision === "approve") {
        action =
          "Human approved this bubble. Wait for commit/merge flow and do not continue new implementation in this round.";
      } else {
        action =
          "Human approval decision received. Continue according to current bubble state/inbox.";
      }
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        "Bubble is READY_FOR_APPROVAL. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now.";
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
      const convergenceInstruction =
        envelope.round <= 1
          ? "Round 1 guardrail: do not run `pairflow converged`. If clean, hand off with `pairflow pass --summary ... --no-findings`; if findings remain, use `pairflow pass --summary ... --finding ...`."
          : "If findings remain, run `pairflow pass --summary ... --finding 'P1:...|artifact://...'` (repeatable; for P0/P1 include finding-level refs). If clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first).";
      action =
        `Implementer handoff received. Run a fresh review now. ${buildReviewerAgentSelectionGuidance(
          bubbleConfig.review_artifact_type
        )} ${buildReviewerSeverityOntologyReminder({ includeFullOntology: useFullReviewerPolicyContext })} ${testDirective} ${convergenceInstruction} Execute pairflow commands directly (no confirmation prompt).`;
    } else if (envelope.type === "HUMAN_REPLY") {
      action =
        "Human response received. Continue review workflow from this update.";
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        "Bubble is READY_FOR_APPROVAL. Review is complete; wait for human decision (`bubble approve` or `bubble request-rework`). Do not run `pairflow pass` now.";
    }
  } else if (recipientRole === "human" || recipientRole === "orchestrator") {
    action = "Check inbox/status and continue human orchestration flow.";
  }

  // Prefix as shell comment so if a pane is in plain bash fallback, this line remains harmless.
  return `# [pairflow] r${envelope.round} ${envelope.type} ${envelope.sender}->${envelope.recipient} msg=${envelope.id} ref=${messageRef}. Action: ${action} ${worktreeHint}`;
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
    input.messageRef ?? input.envelope.refs[0] ?? `transcript.ndjson#${input.envelope.id}`;
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
      input.reviewerTestDirective
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
      input.reviewerTestDirective
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
      input.reviewerTestDirective
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
    input.reviewerTestDirective
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
