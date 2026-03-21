import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { readStateSnapshot } from "../../../core/state/stateStore.js";

export type ResolvedBubbleStatusContext = Awaited<ReturnType<typeof resolveBubbleById>>;
export type BubbleStatusState = Awaited<ReturnType<typeof readStateSnapshot>>["state"];

export interface StatusGateState {
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
}
