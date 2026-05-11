import type { BubbleStateSnapshot } from "../../../domain/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import { assertValidBubbleStateSnapshot } from "../../../domain/state/stateSchema.js";

export interface RemoteApprovalPayloadErrorContext {
  bubbleId: string;
  phase: string;
  action?: "approve" | "request-rework";
  exitCode?: number;
  label?: string;
}

export interface RemoteApprovalPayloadErrorFactory {
  (input: {
    reasonCode: string;
    message: string;
    cause?: unknown;
    context: RemoteApprovalPayloadErrorContext;
  }): Error;
}

function escapeRegExpLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function createApprovalPayloadError(
  createPayloadError: RemoteApprovalPayloadErrorFactory,
  input: {
    bubbleId: string;
    action: "approve" | "request-rework";
    phase: string;
    reasonCode: string;
    message: string;
    cause?: unknown;
    label?: string;
  }
): Error {
  return createPayloadError({
    reasonCode: input.reasonCode,
    message: input.message,
    cause: input.cause,
    context: {
      bubbleId: input.bubbleId,
      phase: input.phase,
      action: input.action,
      ...(input.label !== undefined ? { label: input.label } : {})
    }
  });
}

export function extractMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
  bubbleId: string;
  action: "approve" | "request-rework";
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): string {
  const pattern = new RegExp(
    `${escapeRegExpLiteral(input.startMarker)}\\n([\\s\\S]*?)\\n${escapeRegExpLiteral(input.endMarker)}`,
    "gu"
  );
  const matches = [...input.stdout.matchAll(pattern)];
  if (matches.length !== 1) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "marker_extract",
      reasonCode: "REMOTE_APPROVAL_MARKER_ENVELOPE_INVALID",
      message:
        `Remote approval returned stdout without exactly one ${input.label} marker envelope for bubble ${input.bubbleId}.`,
      label: input.label
    });
  }
  return matches[0]?.[1] ?? "";
}

export function parseRemoteBubbleState(input: {
  raw: string;
  bubbleId: string;
  label: string;
  action: "approve" | "request-rework";
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): BubbleStateSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "state_parse",
      reasonCode: "REMOTE_APPROVAL_STATE_JSON_INVALID",
      message:
        `Remote approval returned invalid ${input.label} state JSON for bubble ${input.bubbleId}.`,
      cause: error,
      label: input.label
    });
  }

  try {
    return assertValidBubbleStateSnapshot(parsed);
  } catch (error) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "state_validate",
      reasonCode: "REMOTE_APPROVAL_STATE_PAYLOAD_INVALID",
      message:
        `Remote approval returned invalid ${input.label} state payload for bubble ${input.bubbleId}.`,
      cause: error,
      label: input.label
    });
  }
}

export function parseTranscriptLineCount(input: {
  raw: string;
  bubbleId: string;
  action: "approve" | "request-rework";
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): number {
  const trimmed = input.raw.trim();
  if (!/^\d+$/u.test(trimmed)) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "transcript_count",
      reasonCode: "REMOTE_APPROVAL_TRANSCRIPT_COUNT_INVALID",
      message:
        `Remote approval returned invalid transcript line count for bubble ${input.bubbleId}: ${trimmed || "<empty>"}.`
    });
  }
  return Number.parseInt(trimmed, 10);
}

export function normalizeEnvelopeMetadata(input: {
  envelope: ProtocolEnvelope;
  bubbleId: string;
  action: "approve" | "request-rework";
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): Record<string, unknown> {
  const metadata = input.envelope.payload.metadata;
  if (metadata === null || metadata === undefined) {
    return {};
  }
  if (typeof metadata !== "object") {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "metadata_validate",
      reasonCode: "REMOTE_APPROVAL_METADATA_INVALID",
      message:
        `Remote approval returned invalid metadata payload for bubble ${input.bubbleId}.`
    });
  }
  return metadata;
}
