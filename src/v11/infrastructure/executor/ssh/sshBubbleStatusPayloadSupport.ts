import {
  isAgentName,
  isAgentRole,
  isBubbleExecutionContextAwaitedOutputType
} from "../../../../types/bubble.js";
import {
  isProtocolMessageType,
  type ProtocolMessageType
} from "../../../../types/protocol.js";
import type {
  RemoteBubbleStatusSnapshot
} from "../../../shared/status/remoteBubbleStatusContract.js";
import type {
  StatusExecutionContextView,
  StatusPaneActivityView
} from "../../../shared/status/statusCommandViewProjection.js";
import type { WatchdogStatus } from "../../../shared/watchdog/watchdogStatus.js";
import {
  isInteger,
  isRecord
} from "../../../shared/validation/primitives.js";
import { toRemoteBubbleStatusError } from "./sshBubbleStatusError.js";

export function failRemotePayload(path: string, expected: string): never {
  throw toRemoteBubbleStatusError({
    code: "REMOTE_STATUS_PAYLOAD_INVALID",
    message: `Remote bubble status payload has invalid ${path}; expected ${expected}.`,
    context: {
      command_name: "status",
      operation: "payload",
      remote_path: path,
      expected
    }
  });
}

export function failRemotePayloadMessage(path: string, message: string): never {
  throw toRemoteBubbleStatusError({
    code: "REMOTE_STATUS_PAYLOAD_INVALID",
    message,
    context: {
      command_name: "status",
      operation: "payload",
      remote_path: path
    }
  });
}

export function asRecordOrThrow(
  value: unknown,
  path: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    failRemotePayload(path, "object");
  }
  return value;
}

export function asNullableString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    failRemotePayload(path, "string|null");
  }
  return value;
}

export function asRequiredString(value: unknown, path: string): string {
  const normalized = asNullableString(value, path);
  if (normalized === null) {
    failRemotePayload(path, "string");
  }
  return normalized;
}

export function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    failRemotePayload(path, "boolean");
  }
  return value;
}

export function asNonNegativeInteger(value: unknown, path: string): number {
  if (!isInteger(value) || value < 0) {
    failRemotePayload(path, "integer >= 0");
  }
  return value;
}

export function asNullableNonNegativeInteger(
  value: unknown,
  path: string
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return asNonNegativeInteger(value, path);
}

export function asPositiveInteger(value: unknown, path: string): number {
  if (!isInteger(value) || value <= 0) {
    failRemotePayload(path, "positive integer");
  }
  return value;
}

export function asNullablePositiveInteger(
  value: unknown,
  path: string
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return asPositiveInteger(value, path);
}

export function asNullableAgentName(
  value: unknown,
  path: string
): WatchdogStatus["monitoredAgent"] {
  const normalized = asNullableString(value, path);
  if (normalized !== null && !isAgentName(normalized)) {
    failRemotePayload(path, "agent name|null");
  }
  return normalized;
}

export function asNullableProtocolMessageTypeValue(
  value: unknown,
  path: string
): ProtocolMessageType | null {
  const normalized = asNullableString(value, path);
  if (normalized !== null && !isProtocolMessageType(normalized)) {
    failRemotePayload(path, "protocol message type|null");
  }
  return normalized;
}

export function normalizePaneActivity(value: unknown): StatusPaneActivityView {
  const paneActivity = asRecordOrThrow(value, "paneActivity");
  const readStatus = paneActivity.readStatus;
  if (readStatus !== "ok" && readStatus !== "missing" && readStatus !== "invalid") {
    failRemotePayload("paneActivity.readStatus", "ok|missing|invalid");
  }

  const lastSampleStatus = paneActivity.lastSampleStatus;
  if (
    lastSampleStatus !== null
    && lastSampleStatus !== undefined
    && lastSampleStatus !== "sampled"
    && lastSampleStatus !== "no_session"
    && lastSampleStatus !== "pane_unreadable"
  ) {
    failRemotePayloadMessage(
      "paneActivity.lastSampleStatus",
      "Remote bubble status payload has invalid paneActivity.lastSampleStatus."
    );
  }

  return {
    readStatus,
    lastChangedAt: asNullableString(paneActivity.lastChangedAt, "paneActivity.lastChangedAt"),
    sampledAt: asNullableString(paneActivity.sampledAt, "paneActivity.sampledAt"),
    sinceLastChangedSeconds: asNullableNonNegativeInteger(
      paneActivity.sinceLastChangedSeconds,
      "paneActivity.sinceLastChangedSeconds"
    ),
    sinceSampledSeconds: asNullableNonNegativeInteger(
      paneActivity.sinceSampledSeconds,
      "paneActivity.sinceSampledSeconds"
    ),
    lastSampleStatus:
      lastSampleStatus === undefined ? null : lastSampleStatus,
    lastSampleError: asNullableString(
      paneActivity.lastSampleError,
      "paneActivity.lastSampleError"
    ),
    sessionName: asNullableString(paneActivity.sessionName, "paneActivity.sessionName"),
    targetPane: asNullableString(paneActivity.targetPane, "paneActivity.targetPane")
  };
}

export function normalizeExecutionContext(
  value: unknown
): StatusExecutionContextView | null {
  if (value === null || value === undefined) {
    return null;
  }
  const executionContext = asRecordOrThrow(value, "executionContext");
  const activeRole = asNullableString(
    executionContext.activeRole,
    "executionContext.activeRole"
  );
  if (activeRole === null || !isAgentRole(activeRole)) {
    failRemotePayloadMessage(
      "executionContext.activeRole",
      "Remote bubble status payload has invalid executionContext.activeRole."
    );
  }

  const awaitedOutputType = asNullableString(
    executionContext.awaitedOutputType,
    "executionContext.awaitedOutputType"
  );
  if (
    awaitedOutputType === null
    || !isBubbleExecutionContextAwaitedOutputType(awaitedOutputType)
  ) {
    failRemotePayloadMessage(
      "executionContext.awaitedOutputType",
      "Remote bubble status payload has invalid executionContext.awaitedOutputType."
    );
  }

  const handoffId = asNullableString(
    executionContext.handoffId,
    "executionContext.handoffId"
  );
  const executionId = asNullableString(
    executionContext.executionId,
    "executionContext.executionId"
  );
  const startedAt = asNullableString(
    executionContext.startedAt,
    "executionContext.startedAt"
  );
  const deadlineAt = asNullableString(
    executionContext.deadlineAt,
    "executionContext.deadlineAt"
  );
  if (
    handoffId === null
    || executionId === null
    || startedAt === null
    || deadlineAt === null
  ) {
    failRemotePayloadMessage(
      "executionContext",
      "Remote bubble status payload has incomplete executionContext authority."
    );
  }

  return {
    activeRole,
    awaitedOutputType,
    handoffId,
    executionId,
    round: asNonNegativeInteger(executionContext.round, "executionContext.round"),
    startedAt,
    deadlineAt,
    attempt: asPositiveInteger(executionContext.attempt, "executionContext.attempt")
  };
}

export function normalizeWatchdog(value: unknown): WatchdogStatus {
  const watchdog = asRecordOrThrow(value, "watchdog");
  return {
    monitored: asBoolean(watchdog.monitored, "watchdog.monitored"),
    monitoredAgent: asNullableAgentName(
      watchdog.monitoredAgent,
      "watchdog.monitoredAgent"
    ),
    timeoutMinutes: asPositiveInteger(
      watchdog.timeoutMinutes,
      "watchdog.timeoutMinutes"
    ),
    referenceTimestamp: asNullableString(
      watchdog.referenceTimestamp,
      "watchdog.referenceTimestamp"
    ),
    deadlineTimestamp: asNullableString(
      watchdog.deadlineTimestamp,
      "watchdog.deadlineTimestamp"
    ),
    remainingSeconds: asNullableNonNegativeInteger(
      watchdog.remainingSeconds,
      "watchdog.remainingSeconds"
    ),
    expired: asBoolean(watchdog.expired, "watchdog.expired")
  };
}

export function normalizePendingInboxItems(
  value: unknown
): RemoteBubbleStatusSnapshot["pendingInboxItems"] {
  const pendingInboxItems = asRecordOrThrow(value, "pendingInboxItems");
  return {
    humanQuestions: asNonNegativeInteger(
      pendingInboxItems.humanQuestions,
      "pendingInboxItems.humanQuestions"
    ),
    approvalRequests: asNonNegativeInteger(
      pendingInboxItems.approvalRequests,
      "pendingInboxItems.approvalRequests"
    ),
    total: asNonNegativeInteger(pendingInboxItems.total, "pendingInboxItems.total")
  };
}

export function normalizeTranscript(
  value: unknown
): RemoteBubbleStatusSnapshot["transcript"] {
  const transcript = asRecordOrThrow(value, "transcript");
  return {
    totalMessages: asNonNegativeInteger(
      transcript.totalMessages,
      "transcript.totalMessages"
    ),
    lastMessageType: asNullableProtocolMessageTypeValue(
      transcript.lastMessageType,
      "transcript.lastMessageType"
    ),
    lastMessageTs: asNullableString(transcript.lastMessageTs, "transcript.lastMessageTs"),
    lastMessageId: asNullableString(transcript.lastMessageId, "transcript.lastMessageId")
  };
}
