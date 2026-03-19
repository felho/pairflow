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

export function buildKickoffFailureResult(
  input: BuildKickoffFailureResultInput
): KickoffBubbleResultShape {
  return {
    ok: false,
    bubble_id: input.bubbleId,
    reason_code: input.reasonCode,
    state_changed: false,
    protocol: {
      task_envelope_appended: false
    },
    markers_before: input.markersBefore,
    markers_after: input.markersBefore,
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

export function buildKickoffSuccessResult(
  input: BuildKickoffSuccessResultInput
): KickoffBubbleResultShape {
  return {
    ok: true,
    bubble_id: input.bubbleId,
    reason_code: null,
    state_changed: true,
    protocol: {
      task_envelope_appended: true
    },
    markers_before: input.markersBefore,
    markers_after: {
      ideation_mode: true,
      ideation_task_pending: false
    },
    state_before: input.stateBefore,
    state_after: input.stateAfter
  };
}
