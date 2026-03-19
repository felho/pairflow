import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  writeKickoffState,
  type KickoffWrittenState
} from "./kickoffStateWrite.js";

export interface LoadedKickoffState {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface PersistKickoffStateInput {
  statePath: string;
  loadedFingerprint: string;
  nextState: BubbleStateSnapshot;
  readState: (
    statePath: string
  ) => Promise<LoadedKickoffState>;
  writeState: (
    statePath: string,
    state: BubbleStateSnapshot,
    options: {
      expectedFingerprint: string;
      expectedState: "RUNNING";
    }
  ) => Promise<KickoffWrittenState>;
}

export type PersistKickoffStateResult =
  | {
      kind: "success";
      writtenState: KickoffWrittenState;
    }
  | {
      kind: "conflict";
    };

function buildKickoffStateConflictResult(): PersistKickoffStateResult {
  return {
    kind: "conflict"
  };
}

function buildKickoffStateSuccessResult(input: {
  writtenState: KickoffWrittenState;
}): PersistKickoffStateResult {
  return {
    kind: "success",
    writtenState: input.writtenState
  };
}

export async function persistKickoffState(
  input: PersistKickoffStateInput
): Promise<PersistKickoffStateResult> {
  const latestState = await input.readState(input.statePath);
  if (latestState.fingerprint !== input.loadedFingerprint) {
    return buildKickoffStateConflictResult();
  }

  const stateWriteResult = await writeKickoffState({
    statePath: input.statePath,
    nextState: input.nextState,
    expectedFingerprint: input.loadedFingerprint,
    writeState: input.writeState
  });
  if (stateWriteResult.kind === "conflict") {
    return buildKickoffStateConflictResult();
  }

  return buildKickoffStateSuccessResult({
    writtenState: stateWriteResult.writtenState
  });
}
