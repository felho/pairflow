import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import {
  type KickoffWrittenState,
  type writeKickoffState
} from "./kickoffStateWrite.js";

export interface BuildKickoffStateWriteInputInput {
  statePath: string;
  loadedFingerprint: string;
  nextState: PersistedBubbleStateSnapshot;
  writeState: (
    statePath: string,
    state: PersistedBubbleStateSnapshot,
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
