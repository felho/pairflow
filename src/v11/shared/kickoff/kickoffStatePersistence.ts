import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  writeKickoffState,
  type KickoffWrittenState
} from "./kickoffStateWrite.js";
import { hasKickoffStateFingerprintConflict } from "./kickoffStateConflictCheck.js";

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

function mapKickoffStateWriteResult(
  result: Awaited<ReturnType<typeof writeKickoffState>>
): PersistKickoffStateResult {
  if (result.kind === "conflict") {
    return buildKickoffStateConflictResult();
  }

  return buildKickoffStateSuccessResult({
    writtenState: result.writtenState
  });
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
