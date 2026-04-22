import type { BubbleActionKind, BubbleLifecycleState } from "./types";

const actionAvailabilityMatrix: Record<BubbleLifecycleState, readonly BubbleActionKind[]> = {
  CREATED: ["start", "update-review-policy", "stop"],
  PREPARING_WORKSPACE: ["update-review-policy", "stop"],
  RUNNING: ["update-review-policy", "restart", "open", "stop"],
  WAITING_HUMAN: [
    "request-rework",
    "reply",
    "resume",
    "update-review-policy",
    "restart",
    "open",
    "stop"
  ],
  READY_FOR_HUMAN_APPROVAL: [
    "approve",
    "request-rework",
    "update-review-policy",
    "restart",
    "open",
    "stop"
  ],
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
