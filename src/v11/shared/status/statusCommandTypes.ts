import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { ReadStateSnapshotPort } from "../../ports/stateSnapshots.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";

export type ResolvedBubbleStatusContext = Awaited<
  ReturnType<ResolveBubbleByIdPort>
>;
export type BubbleStatusState = Awaited<
  ReturnType<ReadStateSnapshotPort>
>["state"];

export interface StatusGateState {
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
}
