import { basename, dirname, join } from "node:path";

import { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { runTmux, runtimePaneIndices, type TmuxRunner } from "./tmuxManager.js";
import {
  checkTmuxPaneMarkerStatus,
  confirmTmuxPaneMarkerSubmission,
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage,
  submitTmuxPaneInput
} from "./tmuxInput.js";
import { buildReviewerAgentSelectionGuidance } from "../../../shared/reviewer/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../../shared/reviewer/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../../shared/reviewer/reviewerScoutExpansionGuidance.js";
import {
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection,
  type ReviewerCommandGateProjectionVariant
} from "../../../shared/reviewer/reviewerCommandGateGuidance.js";
import {
  buildReviewerDecisionMatrixReminder,
  formatReviewerTestExecutionDirective,
  type ReviewerTestExecutionDirective
} from "../../../../core/reviewer/testEvidence.js";
import {
  formatReviewerBriefDeliveryReminder,
  formatReviewerFocusDeliveryReminder,
  type ReviewerFocusExtractionResult
} from "../../../../core/reviewer/reviewerBrief.js";
import { buildPairflowCommandGuidance } from "../../executor/command/pairflowCommand.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../../shared/metaReview/metaReviewSubmitGuidance.js";
import type { BubbleConfig } from "../../../../types/bubble.js";
import type { AgentName } from "../../../../types/bubble.js";
import {
  parseDeliveryTargetRoleMetadata,
  type DeliveryTargetRole,
  type ProtocolEnvelope,
  type ProtocolParticipant
} from "../../../../types/protocol.js";

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

export type DeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

export interface EmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: TmuxDeliveryFailureReason;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

type DeliveryMessageRecipientRole =
  | ProtocolParticipant
  | "implementer"
  | "reviewer"
  | "meta-reviewer"
  | "status";

function normalizePaneIndex(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function resolveTargetPaneIndex(
  recipient: ProtocolParticipant | "meta-reviewer",
  bubbleConfig: BubbleConfig
): number | undefined {
  if (recipient === bubbleConfig.agents.implementer) {
    return normalizePaneIndex(runtimePaneIndices.implementer);
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return normalizePaneIndex(runtimePaneIndices.reviewer);
  }
  if (recipient === "meta-reviewer") {
    return normalizePaneIndex(runtimePaneIndices.metaReviewer);
  }
  if (recipient === "human" || recipient === "orchestrator") {
    return normalizePaneIndex(runtimePaneIndices.status);
  }
  return undefined;
}

function resolveRecipientRoleFromRecipient(
  recipient: ProtocolParticipant | "meta-reviewer",
  bubbleConfig: BubbleConfig
): DeliveryMessageRecipientRole {
  if (recipient === bubbleConfig.agents.implementer) {
    return "implementer";
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return "reviewer";
  }
  return recipient;
}

function resolvePaneIndexByDeliveryTargetRole(role: DeliveryTargetRole): number | undefined {
  if (role === "implementer") {
    return normalizePaneIndex(runtimePaneIndices.implementer);
  }
  if (role === "reviewer") {
    return normalizePaneIndex(runtimePaneIndices.reviewer);
  }
  if (role === "meta_reviewer") {
    return normalizePaneIndex(runtimePaneIndices.metaReviewer);
  }
  return normalizePaneIndex(runtimePaneIndices.status);
}

interface EnvelopeTargetPaneResolution {
  targetPaneIndex: number | undefined;
  recipientRole: DeliveryMessageRecipientRole;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

function resolveEnvelopeTargetPane(
  envelope: ProtocolEnvelope,
  bubbleConfig: BubbleConfig
): EnvelopeTargetPaneResolution {
  const fallbackPane = resolveTargetPaneIndex(envelope.recipient, bubbleConfig);
  const fallbackRecipientRole = resolveRecipientRoleFromRecipient(
    envelope.recipient,
    bubbleConfig
  );
  const parsed = parseDeliveryTargetRoleMetadata(envelope.payload.metadata);
  if (parsed.status === "absent") {
    return {
      targetPaneIndex: fallbackPane,
      recipientRole: fallbackRecipientRole,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_ABSENT"
    };
  }
  if (parsed.status === "invalid") {
    return {
      targetPaneIndex: fallbackPane,
      recipientRole: fallbackRecipientRole,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID"
    };
  }
  const explicitPane = resolvePaneIndexByDeliveryTargetRole(parsed.role);
  if (explicitPane === undefined) {
    return {
      targetPaneIndex: fallbackPane,
      recipientRole: fallbackRecipientRole,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
    };
  }
  if (parsed.role === "meta_reviewer") {
    return {
      targetPaneIndex: explicitPane,
      recipientRole: "meta-reviewer"
    };
  }
  return {
    targetPaneIndex: explicitPane,
    recipientRole: parsed.role
  };
}

function resolvePayloadActor(envelope: ProtocolEnvelope): string | null {
  const metadata = envelope.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }
  const actor = (metadata as { actor?: unknown }).actor;
  return typeof actor === "string" && actor.trim().length > 0 ? actor : null;
}

function resolveImplementerReworkOrigin(
  envelope: ProtocolEnvelope
): "meta_review_auto_rework" | "unknown" {
  const actorLabel = resolvePayloadActor(envelope);
  if (
    actorLabel === "meta-reviewer" ||
    actorLabel === "meta-review-gate"
  ) {
    return "meta_review_auto_rework";
  }
  return "unknown";
}

function buildImplementerReworkActionText(input: {
  docsOnly: boolean;
  origin: "meta_review_auto_rework" | "unknown";
}): string {
  const intro =
    input.origin === "meta_review_auto_rework"
      ? "Meta-review auto-rework received."
      : "Rework received.";
  return input.docsOnly
    ? `${intro} Continue implementation now and address the requested changes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. Primary artifact rule (docs-only): apply the rework on the referenced source task/document file directly, not only in a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no \`.pairflow/evidence/*.log\` refs in that PASS.`
    : `${intro} Continue implementation now and address the requested changes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
}

function buildDeliveryMessage(
  envelope: ProtocolEnvelope,
  messageRef: string,
  bubbleConfig: BubbleConfig,
  worktreePath?: string,
  reviewerTestDirective?: ReviewerTestExecutionDirective,
  reviewerBrief?: string,
  reviewerFocus?: ReviewerFocusExtractionResult,
  recipientRoleOverride?: DeliveryMessageRecipientRole
): string {
  const recipientRole =
    recipientRoleOverride
    ?? resolveRecipientRoleFromRecipient(envelope.recipient, bubbleConfig);
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
        ? "Reviewer feedback received. Implement fixes, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly (no confirmation prompt). Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output. Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path. Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed."
        : "Reviewer feedback received. Implement fixes, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly (no confirmation prompt). If `.pairflow/evidence/*.log` files exist, include them as `--ref` (lint/typecheck/test). If only a subset ran, attach refs for that subset and state what was intentionally not executed.";
    } else if (envelope.type === "HUMAN_REPLY") {
      action = docsOnly
        ? "Human response received. Continue implementation using this input, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly. Primary artifact rule (docs-only): refine the referenced source task/document file directly, not only a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
        : "Human response received. Continue implementation using this input, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly. Include available `.pairflow/evidence/*.log` refs on PASS.";
    } else if (envelope.type === "APPROVAL_DECISION") {
      if (envelope.payload.decision === "rework") {
        action = buildImplementerReworkActionText({
          docsOnly,
          origin: resolveImplementerReworkOrigin(envelope)
        });
      } else {
        action =
          "Human approved this bubble. Wait for commit/merge flow and do not continue new implementation in this round.";
      }
    } else if (envelope.type === "APPROVAL_REQUEST") {
      action =
        actorLabel === "meta-reviewer"
          ? "Meta-reviewer requested human gate decision. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now."
          : "Bubble is READY_FOR_HUMAN_APPROVAL. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now.";
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
          ? "In round 1, use canonical pass emit (`pairflow agent emit --kind pass ...`) and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when truly clean)."
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
          ? "Meta-reviewer requested human gate decision. Wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now."
          : "Bubble is READY_FOR_HUMAN_APPROVAL. Review is complete; wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now.";
    }
  } else if (recipientRole === "meta-reviewer") {
    action =
      `Meta-review task received. Produce autonomous meta-review output and return only through structured submit with required report-json parity fields: \`${buildMetaReviewSubmitCommandTemplate()}\`. ${buildMetaReviewSubmitApproveParityNote()}`;
  } else if (
    recipientRole === "human" ||
    recipientRole === "orchestrator" ||
    recipientRole === "status"
  ) {
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
  const targetResolution = resolveEnvelopeTargetPane(
    input.envelope,
    input.bubbleConfig
  );

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
      input.reviewerFocus,
      targetResolution.recipientRole
    );
    return {
      delivered: false,
      message,
      reason: "registry_read_failed",
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
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
      input.reviewerFocus,
      targetResolution.recipientRole
    );
    return {
      delivered: false,
      message,
      reason: "no_runtime_session",
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
    };
  }

  const targetPaneIndex = targetResolution.targetPaneIndex;
  if (targetPaneIndex === undefined) {
    const message = buildDeliveryMessage(
      input.envelope,
      messageRef,
      input.bubbleConfig,
      worktreePath,
      input.reviewerTestDirective,
      input.reviewerBrief,
      input.reviewerFocus,
      targetResolution.recipientRole
    );
    return {
      delivered: false,
      sessionName,
      message,
      reason: "unsupported_recipient",
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
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
    input.reviewerFocus,
    targetResolution.recipientRole
  );
  const runner = input.runner ?? runTmux;

  try {
    if ((input.initialDelayMs ?? 0) > 0) {
      await sleep(input.initialDelayMs as number);
    }
    await maybeAcceptClaudeTrustPrompt(runner, targetPane).catch(() => undefined);
    // Delivery is best-effort, but an explicit tmux write/submit failure should
    // still map to `tmux_send_failed` instead of degrading into unconfirmed.
    await sendAndSubmitTmuxPaneMessage(runner, targetPane, message, {
      requireSuccess: true
    });
    const confirmed = await confirmTmuxPaneMarkerSubmission({
      runner,
      targetPane,
      marker: input.envelope.id,
      ...(input.deliveryAttempts !== undefined
        ? { attempts: input.deliveryAttempts }
        : {})
    });
    if (!confirmed) {
      return {
        delivered: false,
        sessionName,
        targetPaneIndex,
        message,
        reason: "delivery_unconfirmed",
        ...(targetResolution.deliveryTargetReasonCode !== undefined
          ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
          : {})
      };
    }
  } catch {
    return {
      delivered: false,
      sessionName,
      targetPaneIndex,
      message,
      reason: "tmux_send_failed",
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
    };
  }

  return {
    delivered: true,
    sessionName,
    targetPaneIndex,
    message,
    ...(targetResolution.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
      : {})
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
  const markerStatus = await checkTmuxPaneMarkerStatus(
    runner,
    targetPane,
    "[pairflow]"
  );
  if (markerStatus !== "stuck_in_input") {
    // Marker is either already submitted or not present in the live input area.
    return { retried: false, reason: "not_stuck" };
  }

  // Marker only appears after the prompt → stuck in input buffer.
  await submitTmuxPaneInput(runner, targetPane);
  return { retried: true };
}
