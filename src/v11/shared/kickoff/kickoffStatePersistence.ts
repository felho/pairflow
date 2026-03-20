import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  writeKickoffState,
  type KickoffWrittenState
} from "./kickoffStateWrite.js";
import { hasKickoffStateFingerprintConflict } from "./kickoffStateConflictCheck.js";
import {
  buildKickoffStateConflictResult,
  mapKickoffStateWriteResult
} from "./kickoffStateWriteResultMapping.js";

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

function buildKickoffStateWriteInput(
  input: PersistKickoffStateInput
): Parameters<typeof writeKickoffState>[0] {
  return {
    statePath: input.statePath,
    nextState: input.nextState,
    expectedFingerprint: input.loadedFingerprint,
    writeState: input.writeState
  };
}

export async function persistKickoffState(
  input: PersistKickoffStateInput
): Promise<PersistKickoffStateResult> {
  if (await hasKickoffStateFingerprintConflict(input)) {
    return buildKickoffStateConflictResult();
  }

  const stateWriteResult = await writeKickoffState(
    buildKickoffStateWriteInput(input)
  );
  return mapKickoffStateWriteResult(stateWriteResult);
}
