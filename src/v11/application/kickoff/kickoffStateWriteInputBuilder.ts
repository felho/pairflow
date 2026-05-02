import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  type KickoffWrittenState,
  type writeKickoffState
} from "./kickoffStateWrite.js";

export interface BuildKickoffStateWriteInputInput {
  statePath: string;
  loadedFingerprint: string;
  nextState: BubbleStateSnapshot;
  writeState: (
    statePath: string,
    state: BubbleStateSnapshot,
    options: {
      expectedFingerprint: string;
      expectedState: "RUNNING";
    }
  ) => Promise<KickoffWrittenState>;
}

export function buildKickoffStateWriteInput(
  input: BuildKickoffStateWriteInputInput
): Parameters<typeof writeKickoffState>[0] {
  return {
    statePath: input.statePath,
    nextState: input.nextState,
    expectedFingerprint: input.loadedFingerprint,
    writeState: input.writeState
  };
}
