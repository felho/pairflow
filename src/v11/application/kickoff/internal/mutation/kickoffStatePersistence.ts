import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import {
  writeKickoffState,
  type KickoffWrittenState
} from "./kickoffStateWrite.js";
import {
  buildKickoffStateConflictResult,
  mapKickoffStateWriteResult
} from "./kickoffStateWriteResultMapping.js";
import { buildKickoffStateWriteInput } from "./kickoffStateWriteInputBuilder.js";

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

async function hasKickoffStateFingerprintConflict(
  input: Pick<PersistKickoffStateInput, "statePath" | "loadedFingerprint" | "readState">
): Promise<boolean> {
  const latestState = await input.readState(input.statePath);
  return latestState.fingerprint !== input.loadedFingerprint;
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
