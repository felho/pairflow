import type { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  confirmTmuxPaneMarkerSubmission,
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "./tmuxInput.js";
import type { TmuxRunner } from "./tmuxManager.js";

type TmuxDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "tmux_send_failed";

type DeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

interface EmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: TmuxDeliveryFailureReason;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export interface DeliverySessionContext {
  sessionName?: string;
  worktreePath?: string;
}

export async function readDeliverySessionContext(input: {
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

export function createDeliveryFailureResult(input: {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export async function attemptTmuxDelivery(input: {
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
