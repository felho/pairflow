import { StateStoreConflictError } from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export interface KickoffWrittenState {
  fingerprint: string;
  state: BubbleStateSnapshot;
}

export interface WriteKickoffStateInput {
  statePath: string;
  nextState: BubbleStateSnapshot;
  expectedFingerprint: string;
  writeState: (
    statePath: string,
    state: BubbleStateSnapshot,
    options: {
      expectedFingerprint: string;
      expectedState: "RUNNING";
    }
  ) => Promise<KickoffWrittenState>;
}

export type WriteKickoffStateResult =
  | {
      kind: "success";
      writtenState: KickoffWrittenState;
    }
  | {
      kind: "conflict";
    };

export async function writeKickoffState(
  input: WriteKickoffStateInput
): Promise<WriteKickoffStateResult> {
  try {
    const writtenState = await input.writeState(
      input.statePath,
      input.nextState,
      {
        expectedFingerprint: input.expectedFingerprint,
        expectedState: "RUNNING"
      }
    );
    return {
      kind: "success",
      writtenState
    };
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      return {
        kind: "conflict"
      };
    }
    throw error;
  }
}
