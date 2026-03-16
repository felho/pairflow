import type { BubbleActionKind, BubbleLifecycleState } from "./types";

const actionAvailabilityMatrix: Record<BubbleLifecycleState, readonly BubbleActionKind[]> = {
  CREATED: ["start", "stop"],
  PREPARING_WORKSPACE: ["stop"],
  RUNNING: ["restart", "open", "stop"],
  WAITING_HUMAN: ["request-rework", "reply", "resume", "restart", "open", "stop"],
  READY_FOR_APPROVAL: ["approve", "request-rework", "restart", "open", "stop"],
  META_REVIEW_RUNNING: ["restart", "open", "stop"],
  META_REVIEW_FAILED: ["approve", "request-rework", "restart", "open", "stop"],
  READY_FOR_HUMAN_APPROVAL: ["approve", "request-rework", "restart", "open", "stop"],
  APPROVED_FOR_COMMIT: ["commit", "restart", "open", "stop"],
  COMMITTED: ["restart", "open", "stop"],
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
