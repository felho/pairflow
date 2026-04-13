import { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { runTmux, type TmuxRunner } from "./tmuxManager.js";
import {
  checkTmuxPaneMarkerStatus,
  submitTmuxPaneInput
} from "./tmuxInput.js";
import {
  attemptTmuxDelivery,
  createDeliveryFailureResult,
  readDeliverySessionContext
} from "./tmuxDeliveryRuntime.js";
import type { ReviewerTestExecutionDirective } from "../../../../v11/shared/reviewer/testEvidence.js";
import type { ReviewerFocusExtractionResult } from "../../../../v11/shared/reviewer/reviewerBrief.js";
import {
  buildTmuxDeliveryMessage,
} from "./tmuxDeliveryMessageBuilder.js";
import { resolveDeliveryMessageRef } from "./tmuxDeliveryRefs.js";
import {
  resolveEnvelopeTargetPane,
  resolveTargetPaneIndex
} from "./tmuxDeliveryTargeting.js";
import type { BubbleConfig } from "../../../../types/bubble.js";
import type { AgentName } from "../../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import type { EmitTmuxDeliveryNotificationResult } from "../../../shared/delivery/tmuxDeliveryContract.js";

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

export type {
  DeliveryTargetReasonCode,
  EmitTmuxDeliveryNotificationResult,
  ResolveDeliveryMessageRefInput,
  TmuxDeliveryFailureReason
} from "../../../shared/delivery/tmuxDeliveryContract.js";
export { buildTranscriptFallbackRef, resolveDeliveryMessageRef } from "./tmuxDeliveryRefs.js";

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
  const targetResolution = resolveEnvelopeTargetPane(
    input.envelope,
    input.bubbleConfig
  );
  const buildMessage = (workspacePath: string | undefined): string =>
    buildTmuxDeliveryMessage({
      envelope: input.envelope,
      messageRef,
      bubbleConfig: input.bubbleConfig,
      ...(workspacePath !== undefined ? { workspacePath } : {}),
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
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  let workspacePath: string | undefined;
  try {
    const sessionContext = await readDeliverySessionContext({
      bubbleId: input.bubbleId,
      sessionsPath: input.sessionsPath,
      readSessions
    });
    sessionName = sessionContext.sessionName;
    workspacePath = sessionContext.workspacePath;
  } catch {
    const message = buildMessage(undefined);
    return createDeliveryFailureResult({
      reason: "registry_read_failed",
      message,
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
    });
  }

  if (sessionName === undefined || workspacePath === undefined) {
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
    const message = buildMessage(workspacePath);
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
  const message = buildMessage(workspacePath);
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
