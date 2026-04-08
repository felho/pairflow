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
import type { ReviewerTestExecutionDirective } from "../../../../v11/shared/reviewer/testEvidence.js";
import type { ReviewerFocusExtractionResult } from "../../../../v11/shared/reviewer/reviewerBrief.js";
import {
  buildTmuxDeliveryMessage,
  type DeliveryMessageRecipientRole
} from "./tmuxDeliveryMessageBuilder.js";
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

interface DeliverySessionContext {
  sessionName?: string;
  worktreePath?: string;
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

async function readDeliverySessionContext(input: {
  bubbleId: string;
  sessionsPath: string;
  readSessions: typeof readRuntimeSessionsRegistry;
}): Promise<DeliverySessionContext | undefined> {
  const sessions = await input.readSessions(input.sessionsPath, {
    allowMissing: true
  });
  const record = sessions[input.bubbleId];
  return {
    ...(record?.tmuxSessionName !== undefined
      ? { sessionName: record.tmuxSessionName }
      : {}),
    ...(record?.worktreePath !== undefined
      ? { worktreePath: record.worktreePath }
      : {})
  };
}

function createDeliveryFailureResult(input: {
  reason: TmuxDeliveryFailureReason;
  message: string;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
}): EmitTmuxDeliveryNotificationResult {
  return {
    delivered: false,
    ...(input.sessionName !== undefined ? { sessionName: input.sessionName } : {}),
    ...(input.targetPaneIndex !== undefined ? { targetPaneIndex: input.targetPaneIndex } : {}),
    message: input.message,
    reason: input.reason,
    ...(input.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
      : {})
  };
}

async function attemptTmuxDelivery(input: {
  runner: TmuxRunner;
  targetPane: string;
  envelopeId: string;
  message: string;
  initialDelayMs?: number;
  deliveryAttempts?: number;
  sessionName: string;
  targetPaneIndex: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}): Promise<EmitTmuxDeliveryNotificationResult | undefined> {
  try {
    if ((input.initialDelayMs ?? 0) > 0) {
      await sleep(input.initialDelayMs as number);
    }
    await maybeAcceptClaudeTrustPrompt(input.runner, input.targetPane).catch(() => undefined);
    // Delivery is best-effort, but an explicit tmux write/submit failure should
    // still map to `tmux_send_failed` instead of degrading into unconfirmed.
    await sendAndSubmitTmuxPaneMessage(input.runner, input.targetPane, input.message, {
      requireSuccess: true
    });
    const confirmed = await confirmTmuxPaneMarkerSubmission({
      runner: input.runner,
      targetPane: input.targetPane,
      marker: input.envelopeId,
      ...(input.deliveryAttempts !== undefined ? { attempts: input.deliveryAttempts } : {})
    });
    if (confirmed) {
      return undefined;
    }
    return createDeliveryFailureResult({
      reason: "delivery_unconfirmed",
      message: input.message,
      sessionName: input.sessionName,
      targetPaneIndex: input.targetPaneIndex,
      ...(input.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
        : {})
    });
  } catch {
    return createDeliveryFailureResult({
      reason: "tmux_send_failed",
      message: input.message,
      sessionName: input.sessionName,
      targetPaneIndex: input.targetPaneIndex,
      ...(input.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
        : {})
    });
  }
}

export async function emitTmuxDeliveryNotification(
  input: EmitTmuxDeliveryNotificationInput
): Promise<EmitTmuxDeliveryNotificationResult> {
  const buildMessage = (worktreePath: string | undefined): string =>
    buildTmuxDeliveryMessage({
      envelope: input.envelope,
      messageRef,
      bubbleConfig: input.bubbleConfig,
      ...(worktreePath !== undefined ? { worktreePath } : {}),
      ...(input.reviewerTestDirective !== undefined
        ? { reviewerTestDirective: input.reviewerTestDirective }
        : {}),
      ...(input.reviewerBrief !== undefined
        ? { reviewerBrief: input.reviewerBrief }
        : {}),
      ...(input.reviewerFocus !== undefined
        ? { reviewerFocus: input.reviewerFocus }
        : {}),
      recipientRole: targetResolution.recipientRole
    });
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
    const sessionContext = await readDeliverySessionContext({
      bubbleId: input.bubbleId,
      sessionsPath: input.sessionsPath,
      readSessions
    });
    sessionName = sessionContext?.sessionName;
    worktreePath = sessionContext?.worktreePath;
  } catch {
    const message = buildMessage(undefined);
    return createDeliveryFailureResult({
      reason: "registry_read_failed",
      message,
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
    });
  }

  if (sessionName === undefined) {
    const message = buildMessage(undefined);
    return createDeliveryFailureResult({
      reason: "no_runtime_session",
      message,
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
    });
  }

  const targetPaneIndex = targetResolution.targetPaneIndex;
  if (targetPaneIndex === undefined) {
    const message = buildMessage(worktreePath);
    return createDeliveryFailureResult({
      reason: "unsupported_recipient",
      message,
      sessionName,
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
    });
  }

  const targetPane = `${sessionName}:0.${targetPaneIndex}`;
  const message = buildMessage(worktreePath);
  const runner = input.runner ?? runTmux;
  const deliveryFailure = await attemptTmuxDelivery({
    runner,
    targetPane,
    envelopeId: input.envelope.id,
    message,
    sessionName,
    targetPaneIndex,
    ...(input.initialDelayMs !== undefined ? { initialDelayMs: input.initialDelayMs } : {}),
    ...(input.deliveryAttempts !== undefined ? { deliveryAttempts: input.deliveryAttempts } : {}),
    ...(targetResolution.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
      : {})
  });
  if (deliveryFailure !== undefined) {
    return deliveryFailure;
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
