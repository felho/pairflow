import type { BubbleLifecycleState } from "../../domain/state/lifecycleTypes.js";

export const reviewPolicyMutableStates = [
  "CREATED",
  "PREPARING_WORKSPACE",
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL"
] as const satisfies readonly BubbleLifecycleState[];

const reviewPolicyMutableStateSet = new Set<BubbleLifecycleState>(
  reviewPolicyMutableStates
);

export function isReviewPolicyMutableState(
  state: BubbleLifecycleState
): boolean {
  return reviewPolicyMutableStateSet.has(state);
}
