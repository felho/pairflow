import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../gates/gateStateTypes.js";
import type { InspectedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";

export type ResolvedBubbleStatusContext = Awaited<
  ReturnType<ResolveBubbleByIdPort>
>;
// Status reads via the inspect port's diagnostic projection. Valid snapshots
// also carry a strict domain variant on InspectedStateSnapshot.validatedSnapshot.
export type BubbleStatusState = InspectedStateSnapshot["state"];

export interface StatusGateState {
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
}
