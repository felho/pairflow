import { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { runTmux, type TmuxRunner } from "./tmuxManager.js";
import {
  checkTmuxPaneMarkerStatus,
  submitTmuxPaneInput
} from "./tmuxInput.js";
import {
  attemptTmuxDelivery,
  createRejectedDeliveryAck,
  readDeliverySessionContext,
  type TmuxDeliveryTimingOptions
} from "./tmuxDeliveryRuntime.js";
import {
  buildTmuxDeliveryMessage,
} from "./tmuxDeliveryMessageBuilder.js";
import {
  buildTranscriptFallbackRef,
  resolveDeliveryMessageRef
} from "./tmuxDeliveryRefs.js";
import {
  resolveEnvelopeRecipientRole,
  resolveEnvelopeTargetPane
} from "./tmuxDeliveryTargeting.js";
import {
  resolveWatchdogTargetPaneIndex
} from "../../../shared/watchdog/watchdogPaneTargeting.js";
import type {
  DeliveryAck,
  EmitDeliveryNotificationInput,
  RetryStuckAgentInputOptions,
  RetryStuckAgentInputResult,
} from "../../../shared/delivery/tmuxDeliveryContract.js";

interface EmitDeliveryNotificationRuntimeDependencies {
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
  deliveryTiming?: TmuxDeliveryTimingOptions;
}

export type EmitDeliveryNotificationRuntimeInput =
  EmitDeliveryNotificationInput & EmitDeliveryNotificationRuntimeDependencies;

interface RetryStuckAgentInputRuntimeDependencies {
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}

type RetryStuckAgentInputRuntimeOptions = RetryStuckAgentInputOptions &
  RetryStuckAgentInputRuntimeDependencies;

export type {
  AcceptedDeliveryAck,
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  DeliveryFailureReason,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationInput,
  RejectedDeliveryAck,
  ResolveDeliveryMessageRefInput
} from "../../../shared/delivery/tmuxDeliveryContract.js";
export { buildTranscriptFallbackRef, resolveDeliveryMessageRef } from "./tmuxDeliveryRefs.js";

function buildRegistryReadFailedMessage(
  input: EmitDeliveryNotificationRuntimeInput
): string {
  return buildTmuxDeliveryMessage({
    envelope: input.envelope,
    messageRef:
      input.messageRef ??
      input.envelope.refs[0] ??
      buildTranscriptFallbackRef(
        input.bubbleId,
        input.sessionsPath,
        input.envelope.id
      ),
    bubbleConfig: input.bubbleConfig,
    ...(input.reviewerTestDirective !== undefined
      ? { reviewerTestDirective: input.reviewerTestDirective }
      : {}),
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.reviewerFocus !== undefined
      ? { reviewerFocus: input.reviewerFocus }
      : {}),
    recipientRole: resolveEnvelopeRecipientRole(
      input.envelope,
      input.bubbleConfig,
      input.recipientRole
    )
  });
}

function createDeliveryMessage(input: {
  runtimeInput: EmitDeliveryNotificationRuntimeInput;
  workspacePath: string | undefined;
}): {
  message: string;
  targetResolution: ReturnType<typeof resolveEnvelopeTargetPane>;
} {
  const { runtimeInput, workspacePath } = input;
  const messageRef =
    runtimeInput.messageRef ??
    resolveDeliveryMessageRef({
      bubbleId: runtimeInput.bubbleId,
      sessionsPath: runtimeInput.sessionsPath,
      envelope: runtimeInput.envelope
    });
  const targetResolution = resolveEnvelopeTargetPane(
    runtimeInput.envelope,
    runtimeInput.bubbleConfig,
    runtimeInput.recipientRole
  );
  return {
    message: buildTmuxDeliveryMessage({
      envelope: runtimeInput.envelope,
      messageRef,
      bubbleConfig: runtimeInput.bubbleConfig,
      ...(workspacePath !== undefined ? { workspacePath } : {}),
      ...(runtimeInput.reviewerTestDirective !== undefined
        ? { reviewerTestDirective: runtimeInput.reviewerTestDirective }
        : {}),
      ...(runtimeInput.reviewerBrief !== undefined
        ? { reviewerBrief: runtimeInput.reviewerBrief }
        : {}),
      ...(runtimeInput.reviewerFocus !== undefined
        ? { reviewerFocus: runtimeInput.reviewerFocus }
        : {}),
      recipientRole: targetResolution.recipientRole
    }),
    targetResolution
  };
}

export async function emitDeliveryNotificationAck(
  input: EmitDeliveryNotificationRuntimeInput
): Promise<DeliveryAck> {
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
    return createRejectedDeliveryAck({
      reason: "registry_read_failed",
      message: buildRegistryReadFailedMessage(input),
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
    });
  }

  const { message: workspaceMessage, targetResolution } = createDeliveryMessage({
    runtimeInput: input,
    workspacePath
  });

  if (sessionName === undefined || workspacePath === undefined) {
    return createRejectedDeliveryAck({
      reason: "no_runtime_session",
      message: workspaceMessage,
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
    });
  }

  const targetPaneIndex = targetResolution.targetPaneIndex;
  if (targetPaneIndex === undefined) {
    return createRejectedDeliveryAck({
      reason: "unsupported_recipient",
      message: workspaceMessage,
      sessionName,
      ...(targetResolution.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
        : {})
    });
  }

  const targetPane = `${sessionName}:0.${targetPaneIndex}`;
  const runner = input.runner ?? runTmux;
  const deliveryAck = await attemptTmuxDelivery({
    runner,
    targetPane,
    envelopeId: input.envelope.id,
    message: workspaceMessage,
    sessionName,
    targetPaneIndex,
    ...(input.initialDelayMs !== undefined ? { initialDelayMs: input.initialDelayMs } : {}),
    ...(input.deliveryAttempts !== undefined ? { deliveryAttempts: input.deliveryAttempts } : {}),
    ...(input.deliveryTiming !== undefined ? { timing: input.deliveryTiming } : {}),
    ...(targetResolution.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: targetResolution.deliveryTargetReasonCode }
      : {})
  });
  return deliveryAck;
}

// ---------------------------------------------------------------------------
// Stuck-input retry — called periodically by the watchdog loop
// ---------------------------------------------------------------------------

/**
 * Check whether the active role's tmux pane has a pairflow message stuck
 * in its input buffer (text visible after the prompt but not submitted).
 * If so, press Enter to unstick it.
 *
 * Designed to be called from the watchdog loop (every ~2 s) as a
 * best-effort safety net for delivery failures.
 */
export async function retryStuckAgentInput(
  options: RetryStuckAgentInputRuntimeOptions
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

  const paneIndex = resolveWatchdogTargetPaneIndex(options.activeRole);

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
