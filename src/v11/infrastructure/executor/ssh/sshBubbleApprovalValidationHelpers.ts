import type { BubbleStateSnapshot } from "../../../domain/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";

interface RemoteApprovalPayloadErrorContext {
  bubbleId: string;
  phase: string;
  action?: "approve" | "request-rework";
  exitCode?: number;
  label?: string;
}

type RemoteApprovalPayloadErrorFactory = (input: {
  reasonCode: string;
  message: string;
  cause?: unknown;
  context: RemoteApprovalPayloadErrorContext;
}) => Error;

function createApprovalPayloadError(
  createPayloadError: RemoteApprovalPayloadErrorFactory,
  input: {
    bubbleId: string;
    action: "approve" | "request-rework";
    phase: string;
    reasonCode: string;
    message: string;
  }
): Error {
  return createPayloadError({
    reasonCode: input.reasonCode,
    message: input.message,
    context: {
      bubbleId: input.bubbleId,
      phase: input.phase,
      action: input.action
    }
  });
}

function createQueuedReworkPayloadError(
  createPayloadError: RemoteApprovalPayloadErrorFactory,
  input: {
    bubbleId: string;
    phase: string;
    reasonCode: string;
    message: string;
  }
): Error {
  return createPayloadError({
    reasonCode: input.reasonCode,
    message: input.message,
    context: {
      bubbleId: input.bubbleId,
      phase: input.phase,
      action: "request-rework"
    }
  });
}

function normalizeIntentRefs(refs: string[] | undefined): string[] {
  return refs ?? [];
}

function refsMatch(expected: string[], actual: string[]): boolean {
  return (
    expected.length === actual.length &&
    expected.every((ref, index) => actual[index] === ref)
  );
}

function expectedDecisionState(
  decision: "approve" | "rework"
): BubbleStateSnapshot["state"] {
  return decision === "approve" ? "APPROVED_FOR_COMMIT" : "RUNNING";
}

export function assertDecisionEnvelopeMatches(input: {
  bubbleId: string;
  action: "approve" | "request-rework";
  envelope: ProtocolEnvelope;
  expectedDecision: "approve" | "rework";
  expectedMessage?: string | undefined;
  expectedRefs: string[];
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): void {
  if (
    input.envelope.bubble_id !== input.bubbleId ||
    input.envelope.type !== "APPROVAL_DECISION"
  ) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "transcript_validate",
      reasonCode: "REMOTE_APPROVAL_TRANSCRIPT_TAIL_INVALID",
      message:
        `Remote approval returned a non-approval transcript tail for bubble ${input.bubbleId}.`
    });
  }

  if (input.envelope.payload.decision !== input.expectedDecision) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "decision_validate",
      reasonCode: "REMOTE_APPROVAL_DECISION_MISMATCH",
      message:
        `Remote approval returned decision '${String(input.envelope.payload.decision)}' but expected '${input.expectedDecision}' for bubble ${input.bubbleId}.`
    });
  }

  if (!refsMatch(input.expectedRefs, input.envelope.refs)) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "refs_validate",
      reasonCode: "REMOTE_APPROVAL_REFS_MISMATCH",
      message:
        `Remote approval returned unexpected refs for bubble ${input.bubbleId}.`
    });
  }

  if (input.envelope.payload.message !== input.expectedMessage) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "message_validate",
      reasonCode: "REMOTE_APPROVAL_MESSAGE_MISMATCH",
      message:
        `Remote approval returned an unexpected decision message for bubble ${input.bubbleId}.`
    });
  }
}

export function assertApprovalMetadataMatches(input: {
  bubbleId: string;
  action: "approve" | "request-rework";
  metadata: Record<string, unknown>;
  expectedOverrideNonApprove?: boolean | undefined;
  expectedOverrideReason?: string | undefined;
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): void {
  if (input.metadata.delivery_target_role !== "status") {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "metadata_validate",
      reasonCode: "REMOTE_APPROVAL_DELIVERY_TARGET_INVALID",
      message:
        `Remote approval returned invalid delivery_target_role metadata for bubble ${input.bubbleId}.`
    });
  }

  const actualOverrideNonApprove = input.metadata.override_non_approve;
  if ((input.expectedOverrideNonApprove ?? false) === true) {
    if (actualOverrideNonApprove !== true) {
      throw createApprovalPayloadError(input.createPayloadError, {
        bubbleId: input.bubbleId,
        action: input.action,
        phase: "override_validate",
        reasonCode: "REMOTE_APPROVAL_OVERRIDE_METADATA_INVALID",
        message:
          `Remote approval did not preserve override_non_approve metadata for bubble ${input.bubbleId}.`
      });
    }
    if (input.metadata.override_reason !== input.expectedOverrideReason) {
      throw createApprovalPayloadError(input.createPayloadError, {
        bubbleId: input.bubbleId,
        action: input.action,
        phase: "override_validate",
        reasonCode: "REMOTE_APPROVAL_OVERRIDE_METADATA_INVALID",
        message:
          `Remote approval did not preserve override_reason metadata for bubble ${input.bubbleId}.`
      });
    }
    return;
  }

  if (
    actualOverrideNonApprove !== undefined ||
    input.metadata.override_reason !== undefined
  ) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "override_validate",
      reasonCode: "REMOTE_APPROVAL_OVERRIDE_METADATA_INVALID",
      message:
        `Remote approval returned unexpected override metadata for bubble ${input.bubbleId}.`
    });
  }
}

export function assertDecisionStateMatches(input: {
  bubbleId: string;
  action: "approve" | "request-rework";
  state: BubbleStateSnapshot;
  expectedDecision: "approve" | "rework";
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): void {
  const expectedState = expectedDecisionState(input.expectedDecision);
  if (input.state.state !== expectedState) {
    throw createApprovalPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      action: input.action,
      phase: "state_validate",
      reasonCode: "REMOTE_APPROVAL_STATE_TRANSITION_INVALID",
      message:
        `Remote approval returned state '${input.state.state}' but expected '${expectedState}' after '${input.expectedDecision}' for bubble ${input.bubbleId}.`
    });
  }
}

export function assertQueuedReworkPendingIntent(input: {
  bubbleId: string;
  pendingIntent: NonNullable<BubbleStateSnapshot["pending_rework_intent"]>;
  expectedMessage: string;
  expectedRefs: string[];
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): void {
  if (input.pendingIntent.status !== "pending") {
    throw createQueuedReworkPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      phase: "queued_rework_intent",
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_INTENT_INVALID",
      message:
        `Remote request-rework left intent '${input.pendingIntent.intent_id}' in status '${input.pendingIntent.status}' instead of 'pending' for bubble ${input.bubbleId}.`
    });
  }

  if (input.pendingIntent.requested_by !== "human:request-rework") {
    throw createQueuedReworkPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      phase: "queued_rework_intent",
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_INTENT_INVALID",
      message:
        `Remote request-rework left intent '${input.pendingIntent.intent_id}' with unexpected requested_by '${input.pendingIntent.requested_by}' for bubble ${input.bubbleId}.`
    });
  }

  if (input.pendingIntent.message !== input.expectedMessage) {
    throw createQueuedReworkPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      phase: "queued_rework_message",
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_MESSAGE_MISMATCH",
      message:
        `Remote request-rework left intent '${input.pendingIntent.intent_id}' with an unexpected message for bubble ${input.bubbleId}.`
    });
  }

  const pendingRefs = normalizeIntentRefs(input.pendingIntent.refs);
  if (!refsMatch(input.expectedRefs, pendingRefs)) {
    throw createQueuedReworkPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      phase: "queued_rework_refs",
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_REFS_MISMATCH",
      message:
        `Remote request-rework left intent '${input.pendingIntent.intent_id}' with unexpected refs for bubble ${input.bubbleId}.`
    });
  }
}

export function resolveQueuedReworkSupersededIntentId(input: {
  bubbleId: string;
  beforeState: BubbleStateSnapshot;
  afterState: BubbleStateSnapshot;
  pendingIntentId: string;
  createPayloadError: RemoteApprovalPayloadErrorFactory;
}): string | undefined {
  const previousPendingIntent = input.beforeState.pending_rework_intent ?? null;
  if (previousPendingIntent === null) {
    return undefined;
  }
  if (previousPendingIntent.intent_id === input.pendingIntentId) {
    throw createQueuedReworkPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      phase: "queued_rework_supersession",
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_SUPERSESSION_INVALID",
      message:
        `Remote request-rework did not create a new pending intent for bubble ${input.bubbleId}.`
    });
  }

  const supersededEntry = (input.afterState.rework_intent_history ?? []).find(
    (entry) => entry.intent_id === previousPendingIntent.intent_id
  );
  if (
    supersededEntry?.status !== "superseded" ||
    supersededEntry.superseded_by_intent_id !== input.pendingIntentId
  ) {
    throw createQueuedReworkPayloadError(input.createPayloadError, {
      bubbleId: input.bubbleId,
      phase: "queued_rework_supersession",
      reasonCode: "REMOTE_APPROVAL_QUEUED_REWORK_SUPERSESSION_INVALID",
      message:
        `Remote request-rework did not record supersession for prior pending intent '${previousPendingIntent.intent_id}' in bubble ${input.bubbleId}.`
    });
  }

  return previousPendingIntent.intent_id;
}
