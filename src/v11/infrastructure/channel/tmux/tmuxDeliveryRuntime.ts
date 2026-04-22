import type { readRuntimeSessionsRegistry } from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { resolveRuntimeSessionWorkspaceAuthority } from "../../../shared/runtimeSessionWorkspaceAuthority.js";
import type {
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryFailureReason,
  DeliveryTargetReasonCode
} from "../../../shared/delivery/tmuxDeliveryContract.js";
import {
  confirmTmuxPaneMarkerSubmission,
  maybeAcceptClaudeTrustPrompt,
  sendAndSubmitTmuxPaneMessage
} from "./tmuxInput.js";
import type { TmuxRunner } from "./tmuxManager.js";

export interface DeliverySessionContext {
  sessionName?: string;
  workspacePath?: string;
}

export async function readDeliverySessionContext(input: {
  bubbleId: string;
  sessionsPath: string;
  readSessions: typeof readRuntimeSessionsRegistry;
}): Promise<DeliverySessionContext> {
  const sessions = await input.readSessions(input.sessionsPath, {
    allowMissing: true
  });
  const record = sessions[input.bubbleId];
  const workspaceAuthority = resolveRuntimeSessionWorkspaceAuthority({
    runtimeSessionRecord: record
  });
  return {
    ...(record?.tmuxSessionName !== undefined
      ? { sessionName: record.tmuxSessionName }
      : {}),
    ...(workspaceAuthority.status === "resolved"
      ? { workspacePath: workspaceAuthority.authority.workspacePath }
      : {})
  };
}

function resolveDeliveryAckReasonCode(
  reason: DeliveryFailureReason
): DeliveryAckReasonCode {
  switch (reason) {
    case "no_runtime_session":
    case "registry_read_failed":
      return "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE";
    case "unsupported_recipient":
      return "DELIVERY_ACK_TARGET_UNSUPPORTED";
    case "delivery_unconfirmed":
    case "command_failed":
      return "DELIVERY_ACK_REJECTED";
  }
}

export function createRejectedDeliveryAck(input: {
  reason: DeliveryFailureReason;
  message: string;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
}): DeliveryAck {
  return {
    status: "rejected",
    ...(input.sessionName !== undefined ? { sessionName: input.sessionName } : {}),
    ...(input.targetPaneIndex !== undefined ? { targetPaneIndex: input.targetPaneIndex } : {}),
    message: input.message,
    reason: input.reason,
    reason_code: resolveDeliveryAckReasonCode(input.reason),
    ...(input.deliveryTargetReasonCode !== undefined
      ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
      : {})
  };
}

export function createAcceptedDeliveryAck(input: {
  message: string;
  sessionName: string;
  targetPaneIndex: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}): DeliveryAck {
  return {
    status: "accepted",
    sessionName: input.sessionName,
    targetPaneIndex: input.targetPaneIndex,
    message: input.message,
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
}): Promise<DeliveryAck> {
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
      return createAcceptedDeliveryAck({
        message: input.message,
        sessionName: input.sessionName,
        targetPaneIndex: input.targetPaneIndex,
        ...(input.deliveryTargetReasonCode !== undefined
          ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
          : {})
      });
    }
    return createRejectedDeliveryAck({
      reason: "delivery_unconfirmed",
      message: input.message,
      sessionName: input.sessionName,
      targetPaneIndex: input.targetPaneIndex,
      ...(input.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
      : {})
    });
  } catch {
    return createRejectedDeliveryAck({
      reason: "command_failed",
      message: input.message,
      sessionName: input.sessionName,
      targetPaneIndex: input.targetPaneIndex,
      ...(input.deliveryTargetReasonCode !== undefined
        ? { deliveryTargetReasonCode: input.deliveryTargetReasonCode }
        : {})
    });
  }
}
