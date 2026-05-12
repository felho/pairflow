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
// Status reads via the inspect port (persisted-shape per §10.15
// diagnostic-fallback decision), so BubbleStatusState is the
// inspect-source persisted snapshot.
export type BubbleStatusState = InspectedStateSnapshot["state"];

export interface StatusGateState {
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
}
