import type { BubbleLifecycleState } from "../../types/bubble.js";

export class StateTransitionError extends Error {
  public readonly from: BubbleLifecycleState;
  public readonly to: BubbleLifecycleState;
  public readonly bubbleId: string | undefined;

  public constructor(
    from: BubbleLifecycleState,
    to: BubbleLifecycleState,
    bubbleId?: string
  ) {
    super(
      bubbleId === undefined
        ? `Invalid state transition: ${from} -> ${to}`
        : `Invalid state transition for bubble ${bubbleId}: ${from} -> ${to}`
    );
    this.name = "StateTransitionError";
    this.from = from;
    this.to = to;
    this.bubbleId = bubbleId;
  }
}

const directedTransitions: ReadonlyMap<BubbleLifecycleState, ReadonlySet<BubbleLifecycleState>> =
  new Map([
    ["CREATED", new Set(["PREPARING_WORKSPACE"])],
    ["PREPARING_WORKSPACE", new Set(["RUNNING"])],
    ["RUNNING", new Set(["WAITING_HUMAN", "READY_FOR_APPROVAL"])],
    ["WAITING_HUMAN", new Set(["RUNNING"])],
    ["READY_FOR_APPROVAL", new Set(["RUNNING", "APPROVED_FOR_COMMIT"])],
    ["APPROVED_FOR_COMMIT", new Set(["COMMITTED"])],
    ["COMMITTED", new Set(["DONE"])],
    ["DONE", new Set()],
    ["FAILED", new Set()],
    ["CANCELLED", new Set()]
  ]);

const activeStates = new Set<BubbleLifecycleState>([
  "CREATED",
  "PREPARING_WORKSPACE",
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

const finalStates = new Set<BubbleLifecycleState>(["DONE", "FAILED", "CANCELLED"]);

export function isFinalState(state: BubbleLifecycleState): boolean {
  return finalStates.has(state);
}

export function isActiveState(state: BubbleLifecycleState): boolean {
  return activeStates.has(state);
}

export function canTransition(
  from: BubbleLifecycleState,
  to: BubbleLifecycleState
): boolean {
  // Self transitions are intentionally disallowed for clarity and to avoid
  // accidental no-op transitions on final states.
  if (from === to) {
    return false;
  }

  if (to === "FAILED") {
    return isActiveState(from);
  }

  if (to === "CANCELLED") {
    return !isFinalState(from);
  }

  const allowedTargets = directedTransitions.get(from);
  return allowedTargets?.has(to) ?? false;
}

export function assertTransitionAllowed(
  from: BubbleLifecycleState,
  to: BubbleLifecycleState,
  bubbleId?: string
): void {
  if (!canTransition(from, to)) {
    throw new StateTransitionError(from, to, bubbleId);
  }
}

export function getAllowedTransitions(
  from: BubbleLifecycleState
): BubbleLifecycleState[] {
  const base = directedTransitions.get(from) ?? new Set<BubbleLifecycleState>();
  const allowed = new Set<BubbleLifecycleState>(base);

  if (isActiveState(from)) {
    allowed.add("FAILED");
  }
  if (!isFinalState(from)) {
    allowed.add("CANCELLED");
  }

  return Array.from(allowed.values());
}
