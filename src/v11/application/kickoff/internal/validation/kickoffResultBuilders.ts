import type {
  AgentName,
  AgentRole
} from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleLifecycleState } from "../../../../../contracts/kernel/lifecycle.js";
import type {
  BubbleExecutionContext
} from "../../../../domain/state/execution/executionContext.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../../../../shared/metaReview/metaReviewSnapshotTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../../../../domain/state/rework/reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "../../../../domain/state/snapshot/roundRoleHistory.js";
import type {
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  DeliveryFailureReason
} from "../../../../shared/delivery/tmuxDeliveryContract.js";
import {
  buildKickoffResultBase,
  type BuildKickoffResultBaseInput
} from "./kickoffResultBaseBuilder.js";

export interface KickoffIdeationMarkers {
  ideation_mode: boolean;
  ideation_task_pending: boolean;
}

export interface KickoffResultDelivery {
  status: DeliveryAckStatus;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  retried: boolean;
}

export interface KickoffBubbleResultShape {
  ok: boolean;
  bubble_id: string;
  reason_code: string | null;
  state_changed: boolean;
  protocol: {
    task_envelope_appended: boolean;
  };
  markers_before: KickoffIdeationMarkers;
  markers_after: KickoffIdeationMarkers;
  state_before?: KickoffResultStateSnapshot;
  state_after?: KickoffResultStateSnapshot;
  delivery?: KickoffResultDelivery;
}

export interface KickoffResultStateSnapshot {
  bubble_id: string;
  state: BubbleLifecycleState;
  round: number;
  active_agent: AgentName | null;
  active_since: string | null;
  active_role: AgentRole | null;
  execution_context?: BubbleExecutionContext | null;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent?: BubbleReworkIntentRecord | null;
  rework_intent_history?: BubbleReworkIntentRecord[];
  meta_review?: BubbleMetaReviewSnapshotState;
}

export interface BuildKickoffFailureResultInput {
  bubbleId: string;
  reasonCode: string;
  stateBefore: KickoffResultStateSnapshot;
  markersBefore: KickoffIdeationMarkers;
}

function buildKickoffFailureResultBaseInput(
  input: BuildKickoffFailureResultInput
): BuildKickoffResultBaseInput<KickoffIdeationMarkers> {
  return {
    bubbleId: input.bubbleId,
    taskEnvelopeAppended: false,
    markersBefore: input.markersBefore,
    markersAfter: input.markersBefore
  };
}

export function buildKickoffFailureResult(
  input: BuildKickoffFailureResultInput
): KickoffBubbleResultShape {
  return {
    ...buildKickoffResultBase(buildKickoffFailureResultBaseInput(input)),
    ok: false,
    reason_code: input.reasonCode,
    state_changed: false,
    state_before: input.stateBefore
  };
}

export interface BuildKickoffSuccessResultInput {
  bubbleId: string;
  markersBefore: KickoffIdeationMarkers;
  stateBefore: KickoffResultStateSnapshot;
  stateAfter: KickoffResultStateSnapshot;
  delivery?: KickoffResultDelivery;
}

function buildKickoffSuccessMarkersAfter(): KickoffIdeationMarkers {
  return {
    ideation_mode: true,
    ideation_task_pending: false
  };
}

function buildKickoffSuccessResultBaseInput(
  input: BuildKickoffSuccessResultInput
): BuildKickoffResultBaseInput<KickoffIdeationMarkers> {
  return {
    bubbleId: input.bubbleId,
    taskEnvelopeAppended: true,
    markersBefore: input.markersBefore,
    markersAfter: buildKickoffSuccessMarkersAfter()
  };
}

export function buildKickoffSuccessResult(
  input: BuildKickoffSuccessResultInput
): KickoffBubbleResultShape {
  return {
    ...buildKickoffResultBase(buildKickoffSuccessResultBaseInput(input)),
    ok: true,
    reason_code: null,
    state_changed: true,
    state_before: input.stateBefore,
    state_after: input.stateAfter,
    ...(input.delivery !== undefined
        ? {
          delivery: {
            status: input.delivery.status,
            ...(input.delivery.reason !== undefined
              ? { reason: input.delivery.reason }
              : {}),
            ...(input.delivery.reason_code !== undefined
              ? { reason_code: input.delivery.reason_code }
              : {}),
            retried: input.delivery.retried
          }
        }
      : {})
  };
}
