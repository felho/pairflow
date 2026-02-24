import type { BubbleActionKind, BubbleLifecycleState } from "./types";

const actionAvailabilityMatrix: Record<BubbleLifecycleState, readonly BubbleActionKind[]> = {
  CREATED: ["start", "stop"],
  PREPARING_WORKSPACE: ["stop"],
  RUNNING: ["open", "stop"],
  WAITING_HUMAN: ["reply", "resume", "open", "stop"],
  READY_FOR_APPROVAL: ["approve", "request-rework", "open", "stop"],
  APPROVED_FOR_COMMIT: ["commit", "open", "stop"],
  COMMITTED: ["open", "stop"],
  DONE: ["merge", "open"],
  FAILED: ["open"],
  CANCELLED: ["open"]
};

export function getAvailableActionsForState(
  state: BubbleLifecycleState
): readonly BubbleActionKind[] {
  return actionAvailabilityMatrix[state];
}

export function isActionAvailableForState(
  state: BubbleLifecycleState,
  action: BubbleActionKind
): boolean {
  return actionAvailabilityMatrix[state].includes(action);
}
