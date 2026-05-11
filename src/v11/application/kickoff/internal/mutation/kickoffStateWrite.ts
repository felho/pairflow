import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";

export interface KickoffWrittenState {
  fingerprint: string;
  state: PersistedBubbleStateSnapshot;
}

export interface WriteKickoffStateInput {
  statePath: string;
  nextState: PersistedBubbleStateSnapshot;
  expectedFingerprint: string;
  writeState: (
    statePath: string,
    state: PersistedBubbleStateSnapshot,
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

function buildKickoffWriteSuccessResult(input: {
  writtenState: KickoffWrittenState;
}): WriteKickoffStateResult {
  return {
    kind: "success",
    writtenState: input.writtenState
  };
}

function performKickoffStateWrite(
  input: WriteKickoffStateInput
): Promise<KickoffWrittenState> {
  return input.writeState(
    input.statePath,
    input.nextState,
    {
      expectedFingerprint: input.expectedFingerprint,
      expectedState: "RUNNING"
    }
  );
}

export async function writeKickoffState(
  input: WriteKickoffStateInput
): Promise<WriteKickoffStateResult> {
  try {
    const writtenState = await performKickoffStateWrite(input);
    return buildKickoffWriteSuccessResult({
      writtenState
    });
  } catch (error) {
    if (isNamedError(error, "StateStoreConflictError")) {
      return {
        kind: "conflict"
      };
    }
    throw error;
  }
}
