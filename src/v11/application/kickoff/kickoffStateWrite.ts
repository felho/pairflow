import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import { buildKickoffWriteStateOptions } from "./kickoffStateWriteOptions.js";
import { resolveKickoffWriteErrorResult } from "./kickoffStateWriteErrorResult.js";

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
    buildKickoffWriteStateOptions({
      expectedFingerprint: input.expectedFingerprint
    })
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
    const errorResult = resolveKickoffWriteErrorResult(error);
    if (errorResult !== null) {
      return errorResult;
    }
    throw error;
  }
}
