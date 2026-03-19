import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export interface KickoffBubbleResultShape {
  ok: boolean;
  bubble_id: string;
  reason_code: string | null;
  state_changed: boolean;
  protocol: {
    task_envelope_appended: boolean;
  };
  markers_before: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  markers_after: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  state_before?: BubbleStateSnapshot;
  state_after?: BubbleStateSnapshot;
}

export interface BuildKickoffFailureResultInput {
  bubbleId: string;
  reasonCode: string;
  stateBefore: BubbleStateSnapshot;
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
}

function buildKickoffResultBase(input: {
  bubbleId: string;
  taskEnvelopeAppended: boolean;
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  markersAfter: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
}): Omit<
  KickoffBubbleResultShape,
  "ok" | "reason_code" | "state_changed" | "state_before" | "state_after"
> {
  return {
    bubble_id: input.bubbleId,
    protocol: {
      task_envelope_appended: input.taskEnvelopeAppended
    },
    markers_before: input.markersBefore,
    markers_after: input.markersAfter
  };
}

function buildKickoffFailureResultBaseInput(input: BuildKickoffFailureResultInput): Parameters<
  typeof buildKickoffResultBase
>[0] {
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
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  stateBefore: BubbleStateSnapshot;
  stateAfter: BubbleStateSnapshot;
}

function buildKickoffSuccessResultBaseInput(input: BuildKickoffSuccessResultInput): Parameters<
  typeof buildKickoffResultBase
>[0] {
  return {
    bubbleId: input.bubbleId,
    taskEnvelopeAppended: true,
    markersBefore: input.markersBefore,
    markersAfter: {
      ideation_mode: true,
      ideation_task_pending: false
    }
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
    state_after: input.stateAfter
  };
}
