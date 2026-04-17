export const bubbleLifecycleStates = [
  "CREATED",
  "PREPARING_WORKSPACE",
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE",
  "FAILED",
  "CANCELLED"
] as const;

export type BubbleLifecycleState = (typeof bubbleLifecycleStates)[number];
