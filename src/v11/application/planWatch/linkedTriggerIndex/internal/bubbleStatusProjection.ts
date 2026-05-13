import type {
  LinkedBubbleApprovalReadyState,
  LinkedBubbleRole,
  LinkedBubbleStatusPortSnapshot,
  LinkedBubbleStatusSnapshot,
  LinkedBubbleTriggerCandidate
} from "../linkedBubbleTriggerIndexContract.js";

export interface TaskBubbleLink {
  taskId: string;
  taskPath: string;
  bubbleId: string;
  bubbleRole: LinkedBubbleRole;
}

const APPROVAL_READY_STATES = new Set<string>([
  "READY_FOR_HUMAN_APPROVAL",
  "READY_FOR_APPROVAL"
]);

export function isApprovalReadyBubbleState(
  state: string
): state is LinkedBubbleApprovalReadyState {
  return APPROVAL_READY_STATES.has(state);
}

export function toLinkedBubbleSnapshot(
  planPath: string,
  link: TaskBubbleLink,
  status: LinkedBubbleStatusPortSnapshot
): LinkedBubbleStatusSnapshot {
  return {
    planPath,
    taskId: link.taskId,
    taskPath: link.taskPath,
    bubbleId: link.bubbleId,
    bubbleRole: link.bubbleRole,
    state: status.state,
    current: status.current,
    ...(status.observedAt !== undefined ? { observedAt: status.observedAt } : {}),
    ...(status.statusRef !== undefined ? { statusRef: status.statusRef } : {}),
    ...(status.metadata !== undefined ? { metadata: status.metadata } : {})
  };
}

export function toTriggerCandidate(
  planPath: string,
  link: TaskBubbleLink,
  status: LinkedBubbleStatusPortSnapshot & { state: LinkedBubbleApprovalReadyState }
): LinkedBubbleTriggerCandidate {
  return {
    planPath,
    taskId: link.taskId,
    taskPath: link.taskPath,
    bubbleId: link.bubbleId,
    bubbleRole: link.bubbleRole,
    observedState: status.state,
    ...(status.observedAt !== undefined ? { observedAt: status.observedAt } : {}),
    ...(status.statusRef !== undefined ? { statusRef: status.statusRef } : {}),
    ...(status.metadata !== undefined ? { statusMetadata: status.metadata } : {})
  };
}
