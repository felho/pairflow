import type { PersistedBubbleStateSnapshot } from "../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import { parseEnvelopeLine } from "../../../shared/protocol/envelope.js";
import {
  normalizeEnvelopeMetadata,
  type RemoteApprovalPayloadErrorFactory
} from "./sshBubbleApprovalParsingSupport.js";
import {
  assertApprovalMetadataMatches,
  assertDecisionEnvelopeMatches,
  assertDecisionStateMatches,
  assertQueuedReworkPendingIntent,
  resolveQueuedReworkSupersededIntentId
} from "./sshBubbleApprovalValidationHelpers.js";

export interface RemoteBubbleApprovalDecisionResult {
  kind: "decision";
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: PersistedBubbleStateSnapshot;
}

export interface RemoteBubbleApprovalQueuedReworkResult {
  kind: "queued_rework";
  bubbleId: string;
  intentId: string;
  state: PersistedBubbleStateSnapshot;
  supersededIntentId?: string;
}


function parseDecisionEnvelope(input: {
  bubbleId: string;
  action: "approve" | "request-rework";
  transcriptLine: string;
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): ProtocolEnvelope {
  try {
    return parseEnvelopeLine(input.transcriptLine);
  } catch (error) {
    throw input.createPayloadError({
      reasonCode: "REMOTE_APPROVAL_TRANSCRIPT_LINE_INVALID",
      message:
        `Remote approval returned an invalid approval decision transcript line for bubble ${input.bubbleId}.`,
      cause: error,
      context: {
        bubbleId: input.bubbleId,
        phase: "transcript_parse",
        action: input.action
      }
    });
  }
}

export function normalizeDecisionResult(input: {
  bubbleId: string;
  action: "approve" | "request-rework";
  expectedDecision: "approve" | "rework";
  expectedMessage?: string;
  expectedRefs: string[];
  expectedOverrideNonApprove?: boolean;
  expectedOverrideReason?: string;
  transcriptLine: string;
  transcriptLineCount: number;
  state: PersistedBubbleStateSnapshot;
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): RemoteBubbleApprovalDecisionResult {
  const envelope = parseDecisionEnvelope({
    bubbleId: input.bubbleId,
    action: input.action,
    transcriptLine: input.transcriptLine,
    createPayloadError: input.createPayloadError
  });
  assertDecisionEnvelopeMatches({
    bubbleId: input.bubbleId,
    action: input.action,
    envelope,
    expectedDecision: input.expectedDecision,
    expectedMessage: input.expectedMessage,
    expectedRefs: input.expectedRefs,
    createPayloadError: input.createPayloadError
  });

  const metadata = normalizeEnvelopeMetadata({
    envelope,
    bubbleId: input.bubbleId,
    action: input.action,
    createPayloadError: input.createPayloadError
  });
  if (input.expectedDecision === "approve") {
    assertApprovalMetadataMatches({
      bubbleId: input.bubbleId,
      action: input.action,
      metadata,
      expectedOverrideNonApprove: input.expectedOverrideNonApprove,
      expectedOverrideReason: input.expectedOverrideReason,
      createPayloadError: input.createPayloadError
    });
  }
  assertDecisionStateMatches({
    bubbleId: input.bubbleId,
    action: input.action,
    state: input.state,
    expectedDecision: input.expectedDecision,
    createPayloadError: input.createPayloadError
  });

  return {
    kind: "decision",
    bubbleId: input.bubbleId,
    sequence: input.transcriptLineCount,
    envelope,
    state: input.state
  };
}

export function normalizeQueuedReworkResult(input: {
  bubbleId: string;
  beforeState: PersistedBubbleStateSnapshot;
  afterState: PersistedBubbleStateSnapshot;
  expectedMessage: string;
  expectedRefs: string[];
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): RemoteBubbleApprovalQueuedReworkResult {
  if (input.afterState.state !== "WAITING_HUMAN") {
    throw input.createPayloadError({
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_STATE_INVALID",
      message:
        `Remote request-rework returned state '${input.afterState.state}' but expected 'WAITING_HUMAN' for bubble ${input.bubbleId}.`,
      context: {
        bubbleId: input.bubbleId,
        phase: "queued_rework_state",
        action: "request-rework"
      }
    });
  }

  const pendingIntent = input.afterState.pending_rework_intent;
  if (pendingIntent === null || pendingIntent === undefined) {
    throw input.createPayloadError({
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_INTENT_MISSING",
      message:
        `Remote request-rework did not leave a pending rework intent for bubble ${input.bubbleId}.`,
      context: {
        bubbleId: input.bubbleId,
        phase: "queued_rework_intent",
        action: "request-rework"
      }
    });
  }

  assertQueuedReworkPendingIntent({
    bubbleId: input.bubbleId,
    pendingIntent,
    expectedMessage: input.expectedMessage,
    expectedRefs: input.expectedRefs,
    createPayloadError: input.createPayloadError
  });
  const supersededIntentId = resolveQueuedReworkSupersededIntentId({
    bubbleId: input.bubbleId,
    beforeState: input.beforeState,
    afterState: input.afterState,
    pendingIntentId: pendingIntent.intent_id,
    createPayloadError: input.createPayloadError
  });

  return {
    kind: "queued_rework",
    bubbleId: input.bubbleId,
    intentId: pendingIntent.intent_id,
    state: input.afterState,
    ...(supersededIntentId !== undefined ? { supersededIntentId } : {})
  };
}
