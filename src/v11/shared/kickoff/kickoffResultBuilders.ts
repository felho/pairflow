import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  buildKickoffResultBase,
  type BuildKickoffResultBaseInput
} from "./kickoffResultBaseBuilder.js";

export interface KickoffIdeationMarkers {
  ideation_mode: boolean;
  ideation_task_pending: boolean;
}

export interface KickoffResultDelivery {
  delivered: boolean;
  reason?: string;
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
  state_before?: BubbleStateSnapshot;
  state_after?: BubbleStateSnapshot;
  delivery?: KickoffResultDelivery;
}

export interface BuildKickoffFailureResultInput {
  bubbleId: string;
  reasonCode: string;
  stateBefore: BubbleStateSnapshot;
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
  stateBefore: BubbleStateSnapshot;
  stateAfter: BubbleStateSnapshot;
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
            delivered: input.delivery.delivered,
            ...(input.delivery.reason !== undefined
              ? { reason: input.delivery.reason }
              : {}),
            retried: input.delivery.retried
          }
        }
      : {})
  };
}
